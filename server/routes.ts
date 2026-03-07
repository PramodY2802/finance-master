import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env.SESSION_SECRET || "super-secret-jwt-key";
const REFRESH_SECRET = process.env.SESSION_SECRET ? process.env.SESSION_SECRET + "_refresh" : "super-secret-refresh-key";

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: { id: number; role: string; username: string };
    }
  }
}

function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(401).json({ message: "Invalid token" });
    req.user = user;
    next();
  });
}

function generateAccessToken(user: { id: number; role: string; username: string }) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '15m' });
}

function generateRefreshToken(user: { id: number; role: string; username: string }) {
  return jwt.sign(user, REFRESH_SECRET, { expiresIn: '7d' });
}

function toLocalDateKey(value: Date | string): string {
  const d = new Date(value);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function resolveDateRange(startDate?: string, endDate?: string): {
  start?: Date;
  end?: Date;
} {
  const cleanedStart = startDate?.trim() || undefined;
  const cleanedEnd = endDate?.trim() || undefined;

  if (!cleanedStart && !cleanedEnd) return {};

  if (cleanedStart && cleanedEnd) {
    return {
      start: new Date(`${cleanedStart}T00:00:00`),
      end: new Date(`${cleanedEnd}T23:59:59.999`),
    };
  }

  if (cleanedStart) {
    if (/^\d{4}-\d{2}-01$/.test(cleanedStart)) {
      const [y, m] = cleanedStart.split("-").map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      return {
        start: new Date(`${cleanedStart}T00:00:00`),
        end: new Date(
          `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}T23:59:59.999`,
        ),
      };
    }

    return {
      start: new Date(`${cleanedStart}T00:00:00`),
      end: new Date(`${cleanedStart}T23:59:59.999`),
    };
  }

  return {
    start: new Date(`${cleanedEnd}T00:00:00`),
    end: new Date(`${cleanedEnd}T23:59:59.999`),
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // --- Seed Data ---
  async function seedDatabase() {
    try {
      const admin = await storage.getUserByUsername('admin');
      if (!admin) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await storage.createUser({
          username: 'admin',
          password: hashedPassword,
          enterpriseFid:1,
          userFullName: 'Admin User',
          userEmail:'admin@example.com'
        });
        
        // Also add some default categories
        await storage.createCategory({ name: 'Salary', type: 'income' });
        await storage.createCategory({ name: 'Freelance', type: 'income' });
        await storage.createCategory({ name: 'Food', type: 'expense' });
        await storage.createCategory({ name: 'Rent', type: 'expense' });
        await storage.createCategory({ name: 'Utilities', type: 'expense' });
      }
    } catch (e) {
      console.error("Failed to seed database", e);
    }
  }

  // Auth Routes
  app.post(api.auth.login.path, async (req, res) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      const user = await storage.getUserByUsername(input.username);
      
      if (!user || !(await bcrypt.compare(input.password, user.password))) {
        await storage.createAuditLog(0, 'LOGIN_FAILED', 'User', undefined, `Attempt for username: ${input.username}`);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const userPayload = { id: user.id, role: user.role, username: user.username };
      const token = generateAccessToken(userPayload);
      const refreshToken = generateRefreshToken(userPayload);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      await storage.createRefreshToken(user.id, refreshToken, token, expiresAt);
      await storage.createAuditLog(user.id, 'LOGIN_SUCCESS', 'User', user.id);

      res.status(200).json({ user, token, refreshToken });
    } catch (err) {
      // log everything so we can debug the 500 error
      console.error("Login route error:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      // expose message in development to help debugging
      const body: any = { message: "Internal server error" };
      if (process.env.NODE_ENV !== 'production' && err instanceof Error) {
        body.error = err.message;
      }
      res.status(500).json(body);
    }
  });

  app.post(api.auth.refresh.path, async (req, res) => {
    try {
      const input = api.auth.refresh.input.parse(req.body);
      const refreshToken = input.token;

      const record = await storage.verifyRefreshToken(refreshToken);
      if (!record) {
        return res.status(401).json({ message: "Invalid or expired refresh token" });
      }

      jwt.verify(refreshToken, REFRESH_SECRET, async (err: any, decoded: any) => {
        if (err) return res.status(401).json({ message: "Invalid refresh token" });
        
        const user = await storage.getUser(decoded.id);
        if (!user) return res.status(401).json({ message: "User not found" });

        const userPayload = { id: user.id, role: user.role, username: user.username };
        const newAccessToken = generateAccessToken(userPayload);
        res.status(200).json({ token: newAccessToken });
      });
    } catch (err) {
      console.error("Refresh route error:", err);
      const body: any = { message: "Unauthorized" };
      if (process.env.NODE_ENV !== 'production' && err instanceof Error) {
        body.error = err.message;
      }
      res.status(401).json(body);
    }
  });

  app.post(api.auth.logout.path, async (req, res) => {
    try {
      const input = api.auth.logout.input.parse(req.body);
      if (input.refreshToken) {
        await storage.revokeRefreshToken(input.refreshToken);
      }
      res.status(200).json({ message: "Logged out successfully" });
    } catch (err) {
      res.status(200).json({ message: "Logged out successfully" }); // fail open
    }
  });

  app.post(api.auth.forgotPassword.path, async (req, res) => {
    try {
      const input = api.auth.forgotPassword.input.parse(req.body);
      const user = await storage.getUserByUsername(input.username);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      await storage.createPasswordResetToken(user.id, resetToken, expiresAt);
      await storage.createAuditLog(user.id, 'PASSWORD_RESET_REQUESTED', 'User', user.id);

      // In a real app, send email. Here, return token for testing purposes
      res.status(200).json({ message: "Password reset token generated", token: resetToken });
    } catch (err) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.post(api.auth.resetPassword.path, async (req, res) => {
    try {
      const input = api.auth.resetPassword.input.parse(req.body);
      const record = await storage.verifyPasswordResetToken(input.token);
      
      if (!record) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);
      const { db } = await import('./db');
      const { users } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      await db.update(users).set({ password: hashedPassword }).where(eq(users.id, record.userId));
      await storage.consumePasswordResetToken(input.token);
      await storage.createAuditLog(record.userId, 'PASSWORD_RESET_COMPLETED', 'User', record.userId);

      res.status(200).json({ message: "Password reset successfully" });
    } catch (err) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.get(api.auth.me.path, authenticateToken, async (req, res) => {
    const user = await storage.getUser(req.user!.id);
    if (!user) return res.status(401).json({ message: "User not found" });
    res.status(200).json(user);
  });

  // Protected Routes
  app.use('/api/categories', authenticateToken);
  app.use('/api/incomes', authenticateToken);
  app.use('/api/expenses', authenticateToken);
  app.use('/api/dashboard', authenticateToken);

  app.get(api.dashboard.stats.path, async (req, res) => {
    try {
      const query = api.dashboard.stats.input?.parse({
        startDate: req.query.startDate,
        endDate: req.query.endDate,
      }) || {};
      const startDate = query.startDate;
      const endDate = query.endDate;
      const incomes = await storage.getIncomes(startDate, endDate);
      const expenses = await storage.getExpenses(startDate, endDate);
      
      const range = resolveDateRange(startDate, endDate);
      const isInRange = (value: Date | string) => {
        const d = new Date(value);
        if (range.start && d < range.start) return false;
        if (range.end && d > range.end) return false;
        return true;
      };

      const userIncomes = incomes
        .filter(i => i.userId === req.user!.id)
        .filter(i => isInRange(i.date));
      const userExpenses = expenses
        .filter(e => e.userId === req.user!.id)
        .filter(e => isInRange(e.date));

      const totalIncome = userIncomes.reduce((acc, curr) => acc + Number(curr.amount), 0);
      const totalExpense = userExpenses.reduce((acc, curr) => acc + Number(curr.amount), 0);
      const totalBalance = totalIncome - totalExpense;

      const periodEnd = endDate ? new Date(`${endDate}T23:59:59.999`) : new Date();
      const selectedDayKey = toLocalDateKey(periodEnd);
      const firstDayOfSelectedMonth = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1);

      const todayExpense = userExpenses
        .filter(e => toLocalDateKey(e.date) === selectedDayKey)
        .reduce((acc, curr) => acc + Number(curr.amount), 0);

      const monthlyExpense = userExpenses
        .filter(e => new Date(e.date) >= firstDayOfSelectedMonth)
        .reduce((acc, curr) => acc + Number(curr.amount), 0);

      const monthlyIncome = userIncomes
        .filter(i => new Date(i.date) >= firstDayOfSelectedMonth)
        .reduce((acc, curr) => acc + Number(curr.amount), 0);

      const dateMap = new Map<string, { income: number; expense: number }>();
      
      userIncomes.forEach(i => {
        const d = toLocalDateKey(i.date);
        const current = dateMap.get(d) || { income: 0, expense: 0 };
        current.income += Number(i.amount);
        dateMap.set(d, current);
      });

      userExpenses.forEach(e => {
        const d = toLocalDateKey(e.date);
        const current = dateMap.get(d) || { income: 0, expense: 0 };
        current.expense += Number(e.amount);
        dateMap.set(d, current);
      });

      const expenseVsIncome = Array.from(dateMap.entries()).map(([date, data]) => ({
        date,
        income: data.income,
        expense: data.expense
      })).sort((a, b) => a.date.localeCompare(b.date));

      const dailyExpenseMap = new Map<string, number>();
      userExpenses.forEach(e => {
        const d = toLocalDateKey(e.date);
        dailyExpenseMap.set(d, (dailyExpenseMap.get(d) || 0) + Number(e.amount));
      });
      const dailyExpense = Array.from(dailyExpenseMap.entries()).map(([date, amount]) => ({ date, amount })).sort((a, b) => a.date.localeCompare(b.date));

      const categoryExpenseMap = new Map<string, number>();
      userExpenses.forEach(e => {
        const catName = e.category?.name || 'Uncategorized';
        categoryExpenseMap.set(catName, (categoryExpenseMap.get(catName) || 0) + Number(e.amount));
      });
      const categoryExpense = Array.from(categoryExpenseMap.entries()).map(([category, amount]) => ({ category, amount }));

      res.status(200).json({
        totalBalance: totalBalance.toFixed(2),
        totalIncome: totalIncome.toFixed(2),
        totalExpense: totalExpense.toFixed(2),
        todayExpense: todayExpense.toFixed(2),
        monthlyExpense: monthlyExpense.toFixed(2),
        monthlyIncome: monthlyIncome.toFixed(2),
        expenseVsIncome,
        dailyExpense,
        categoryExpense
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.get(api.categories.list.path, async (req, res) => {
    const cats = await storage.getCategories();
    res.status(200).json(cats);
  });
  
  app.post(api.categories.create.path, async (req, res) => {
    try {
      const input = z
        .object({
          name: z.string().trim().min(1, "Name is required"),
          type: z
            .string()
            .trim()
            .toLowerCase()
            .pipe(z.enum(["income", "expense"])),
        })
        .parse(req.body);
      const cat = await storage.createCategory(input);
      await storage.createAuditLog(req.user!.id, 'CREATE_CATEGORY', 'Category', cat.id);
      res.status(201).json(cat);
    } catch (e) {
      console.error("Create category error:", e);
      if (e instanceof z.ZodError) {
        return res.status(400).json({
          message: e.errors[0]?.message || "Invalid request",
          field: e.errors[0]?.path?.join("."),
        });
      }
      const message = e instanceof Error ? e.message : "Invalid request";
      res.status(400).json({ message });
    }
  });

  app.put(api.categories.update.path, async (req, res) => {
    try {
      const input = z
        .object({
          name: z.string().trim().min(1, "Name is required").optional(),
          type: z
            .string()
            .trim()
            .toLowerCase()
            .pipe(z.enum(["income", "expense"]))
            .optional(),
        })
        .parse(req.body);
      const cat = await storage.updateCategory(Number(req.params.id), input);
      await storage.createAuditLog(req.user!.id, 'UPDATE_CATEGORY', 'Category', cat.id);
      res.status(200).json(cat);
    } catch (e) {
      console.error("Update category error:", e);
      if (e instanceof z.ZodError) {
        return res.status(400).json({
          message: e.errors[0]?.message || "Invalid request",
          field: e.errors[0]?.path?.join("."),
        });
      }
      const message = e instanceof Error ? e.message : "Invalid request";
      res.status(400).json({ message });
    }
  });

  app.delete(api.categories.delete.path, async (req, res) => {
    await storage.deleteCategory(Number(req.params.id));
    await storage.createAuditLog(req.user!.id, 'DELETE_CATEGORY', 'Category', Number(req.params.id));
    res.status(204).send();
  });

  app.get(api.incomes.list.path, async (req, res) => {
    const list = await storage.getIncomes(req.query.startDate as string, req.query.endDate as string);
    res.status(200).json(list.filter(i => i.userId === req.user!.id));
  });

  app.post(api.incomes.create.path, async (req, res) => {
    try {
      const schema = api.incomes.create.input.extend({
        amount: z.coerce.string(),
        date: z.coerce.date()
      });
      const input = schema.parse(req.body);
      const data = await storage.createIncome({ ...input, userId: req.user!.id, amount: input.amount as string, date: input.date as Date });
      await storage.createAuditLog(req.user!.id, 'CREATE_INCOME', 'Income', data.id);
      res.status(201).json(data);
    } catch (e) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.put(api.incomes.update.path, async (req, res) => {
    try {
      const schema = api.incomes.update.input.extend({
        amount: z.coerce.string().optional(),
        date: z.coerce.date().optional()
      });
      const input = schema.parse(req.body);
      const updateData: any = { ...input };
      if (input.amount) updateData.amount = input.amount;
      if (input.date) updateData.date = input.date;

      const data = await storage.updateIncome(Number(req.params.id), updateData);
      await storage.createAuditLog(req.user!.id, 'UPDATE_INCOME', 'Income', data.id);
      res.status(200).json(data);
    } catch (e) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.delete(api.incomes.delete.path, async (req, res) => {
    await storage.deleteIncome(Number(req.params.id));
    await storage.createAuditLog(req.user!.id, 'DELETE_INCOME', 'Income', Number(req.params.id));
    res.status(204).send();
  });

  app.get(api.expenses.list.path, async (req, res) => {
    const list = await storage.getExpenses(req.query.startDate as string, req.query.endDate as string);
    res.status(200).json(list.filter(e => e.userId === req.user!.id));
  });

  app.post(api.expenses.create.path, async (req, res) => {
    try {
      const schema = api.expenses.create.input.extend({
        amount: z.coerce.string(),
        date: z.coerce.date()
      });
      const input = schema.parse(req.body);
      const data = await storage.createExpense({ ...input, userId: req.user!.id, amount: input.amount as string, date: input.date as Date });
      await storage.createAuditLog(req.user!.id, 'CREATE_EXPENSE', 'Expense', data.id);
      res.status(201).json(data);
    } catch (e) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.put(api.expenses.update.path, async (req, res) => {
    try {
      const schema = api.expenses.update.input.extend({
        amount: z.coerce.string().optional(),
        date: z.coerce.date().optional()
      });
      const input = schema.parse(req.body);
      const updateData: any = { ...input };
      if (input.amount) updateData.amount = input.amount;
      if (input.date) updateData.date = input.date;

      const data = await storage.updateExpense(Number(req.params.id), updateData);
      await storage.createAuditLog(req.user!.id, 'UPDATE_EXPENSE', 'Expense', data.id);
      res.status(200).json(data);
    } catch (e) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.delete(api.expenses.delete.path, async (req, res) => {
    await storage.deleteExpense(Number(req.params.id));
    await storage.createAuditLog(req.user!.id, 'DELETE_EXPENSE', 'Expense', Number(req.params.id));
    res.status(204).send();
  });

  // seedDatabase invocation disabled to avoid breaking startup on incompatible DB schemas.
  setTimeout(() => { seedDatabase().catch(e => console.error('Seed failed', e)); }, 3000);

  return httpServer;
}
