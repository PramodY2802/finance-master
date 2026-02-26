import { db } from "./db";
import {
  users,
  refreshTokens,
  passwordResetTokens,
  categories,
  incomes,
  expenses,
  auditLogs,
  type User,
  type InsertUser,
  type Category,
  type InsertCategory,
  type Income,
  type InsertIncome,
  type Expense,
  type InsertExpense,
} from "@shared/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Tokens
  createRefreshToken(
    userId: number,
    token: string,
    expiresAt: Date,
  ): Promise<void>;
  verifyRefreshToken(token: string): Promise<{ userId: number } | undefined>;
  revokeRefreshToken(token: string): Promise<void>;
  createPasswordResetToken(
    userId: number,
    token: string,
    expiresAt: Date,
  ): Promise<void>;
  verifyPasswordResetToken(
    token: string,
  ): Promise<{ userId: number } | undefined>;
  consumePasswordResetToken(token: string): Promise<void>;

  // Categories
  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(
    id: number,
    category: Partial<InsertCategory>,
  ): Promise<Category>;
  deleteCategory(id: number): Promise<void>;

  // Incomes
  getIncomes(
    startDate?: string,
    endDate?: string,
  ): Promise<(Income & { category?: Category })[]>;
  getIncome(id: number): Promise<Income | undefined>;
  createIncome(income: InsertIncome): Promise<Income>;
  updateIncome(id: number, income: Partial<InsertIncome>): Promise<Income>;
  deleteIncome(id: number): Promise<void>;

  // Expenses
  getExpenses(
    startDate?: string,
    endDate?: string,
  ): Promise<(Expense & { category?: Category })[]>;
  getExpense(id: number): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense>;
  deleteExpense(id: number): Promise<void>;

  // Audit Logs
  createAuditLog(
    userId: number,
    action: string,
    entity: string,
    entityId?: number,
    details?: string,
  ): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<any | undefined> {
    const userResult = await db.execute(
      sql`SELECT * FROM users WHERE user_id = ${id} LIMIT 1`,
    );

    const user = userResult.rows[0];

    if (!user) return undefined;

    const userRoleResult = await db.execute(
      sql`SELECT * FROM user_roles WHERE user_fid = ${user.user_id} LIMIT 1`,
    );

    const userRole = userRoleResult.rows[0];

    let roleName = null;

    if (userRole) {
      const roleResult = await db.execute(
        sql`SELECT * FROM roles WHERE role_id = ${userRole.role_fid} LIMIT 1`,
      );

      roleName = roleResult.rows[0]?.role_name || null;
    }

    return {
      id: user.user_id,
      username: user.user_name,
      userFullName: user.user_fullname,
      password: user.user_password,
      userEmail: user.user_email,
      enterpriseFid: user.enterprise_fid,
      createdAt: user.created_timestamp,
      role: roleName,
    };
  }

  async getUserByUsername(username: string): Promise<any | undefined> {
    const userResult = await db.execute(
      sql`SELECT * FROM users WHERE user_name = ${username} LIMIT 1`,
    );

    const user = userResult.rows[0];

    if (!user) return undefined;

    const userRoleResult = await db.execute(
      sql`SELECT * FROM user_roles WHERE user_fid = ${user.user_id} LIMIT 1`,
    );

    const userRole = userRoleResult.rows[0];

    let roleName = null;

    if (userRole) {
      const roleResult = await db.execute(
        sql`SELECT * FROM roles WHERE role_id = ${userRole.role_fid} LIMIT 1`,
      );

      roleName = roleResult.rows[0]?.role_name || null;
    }

    return {
      id: user.user_id,
      username: user.user_name,
      userFullName: user.user_fullname,
      password: user.user_password,
      userEmail: user.user_email,
      enterpriseFid: user.enterprise_fid,
      createdAt: user.created_timestamp,
      role: roleName,
    };
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async createRefreshToken(
    userId: number,
    token: string,
    access_token: string,
    expiresAt: Date,
  ): Promise<void> {
    const now = new Date();
    await db.insert(refreshTokens).values({ userId, token, access_token, expiresAt, createdAt: now, updatedAt: now });
  }

  async verifyRefreshToken(
    token: string,
  ): Promise<{ userId: number } | undefined> {
    const [record] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.token, token),
          gte(refreshTokens.expiresAt, new Date()),
        ),
      );
    return record ? { userId: record.userId } : undefined;
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
  }

  async createPasswordResetToken(
    userId: number,
    token: string,
    expiresAt: Date,
  ): Promise<void> {
    await db.insert(passwordResetTokens).values({ userId, token, expiresAt });
  }

  async verifyPasswordResetToken(
    token: string,
  ): Promise<{ userId: number } | undefined> {
    const [record] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          gte(passwordResetTokens.expiresAt, new Date()),
        ),
      );
    return record ? { userId: record.userId } : undefined;
  }

  async consumePasswordResetToken(token: string): Promise<void> {
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
  }

  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id));
    return category;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [created] = await db.insert(categories).values(category).returning();
    return created;
  }

  async updateCategory(
    id: number,
    updates: Partial<InsertCategory>,
  ): Promise<Category> {
    const [updated] = await db
      .update(categories)
      .set(updates)
      .where(eq(categories.id, id))
      .returning();
    return updated;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async getIncomes(
    startDate?: string,
    endDate?: string,
  ): Promise<(Income & { category?: Category })[]> {
    let query = db
      .select()
      .from(incomes)
      .leftJoin(categories, eq(incomes.categoryId, categories.id))
      .$dynamic();

    if (startDate && endDate) {
      query = query.where(
        and(
          gte(incomes.date, new Date(startDate)),
          lte(incomes.date, new Date(endDate)),
        ),
      );
    }

    const results = await query.orderBy(desc(incomes.date));
    return results.map((r) => ({
      ...r.incomes,
      category: r.categories || undefined,
    }));
  }

  async getIncome(id: number): Promise<Income | undefined> {
    const [income] = await db.select().from(incomes).where(eq(incomes.id, id));
    return income;
  }

  async createIncome(income: InsertIncome): Promise<Income> {
    const [created] = await db.insert(incomes).values(income).returning();
    return created;
  }

  async updateIncome(
    id: number,
    updates: Partial<InsertIncome>,
  ): Promise<Income> {
    const [updated] = await db
      .update(incomes)
      .set(updates)
      .where(eq(incomes.id, id))
      .returning();
    return updated;
  }

  async deleteIncome(id: number): Promise<void> {
    await db.delete(incomes).where(eq(incomes.id, id));
  }

  async getExpenses(
    startDate?: string,
    endDate?: string,
  ): Promise<(Expense & { category?: Category })[]> {
    let query = db
      .select()
      .from(expenses)
      .leftJoin(categories, eq(expenses.categoryId, categories.id))
      .$dynamic();

    if (startDate && endDate) {
      query = query.where(
        and(
          gte(expenses.date, new Date(startDate)),
          lte(expenses.date, new Date(endDate)),
        ),
      );
    }

    const results = await query.orderBy(desc(expenses.date));
    return results.map((r) => ({
      ...r.expenses,
      category: r.categories || undefined,
    }));
  }

  async getExpense(id: number): Promise<Expense | undefined> {
    const [expense] = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, id));
    return expense;
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [created] = await db.insert(expenses).values(expense).returning();
    return created;
  }

  async updateExpense(
    id: number,
    updates: Partial<InsertExpense>,
  ): Promise<Expense> {
    const [updated] = await db
      .update(expenses)
      .set(updates)
      .where(eq(expenses.id, id))
      .returning();
    return updated;
  }

  async deleteExpense(id: number): Promise<void> {
    await db.delete(expenses).where(eq(expenses.id, id));
  }

  async createAuditLog(
    userId: number,
    action: string,
    entity: string,
    entityId?: number,
    details?: string,
  ): Promise<void> {
    await db
      .insert(auditLogs)
      .values({ userId, action, entity, entityId, details });
  }
}

export const storage = new DatabaseStorage();
