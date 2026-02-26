import { pgTable, text, serial, integer, timestamp, numeric } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users
export const users = pgTable("users", {
  id: serial("user_id").primaryKey(),
  username: text("user_name").notNull().unique(),
  userFullName: text("user_fullname").notNull(),
  password: text("user_password").notNull(),
  userEmail: text("user_email").notNull().unique(),
  enterpriseFid: integer("enterprise_fid").notNull(),
  createdAt: timestamp("created_timestamp").defaultNow(),
});

// Refresh Tokens
export const refreshTokens = pgTable("user_sessions", {
  id: serial("session_id").primaryKey(),
  userId: integer("user_fid").notNull(),
  token: text("refresh_token").notNull(),
  expiresAt: timestamp("refresh_expires_at").notNull(),
  access_token: text("access_token").notNull(), 
  createdAt: timestamp("created_timestamp").defaultNow(),
  updatedAt: timestamp("updated_timestamp").defaultNow(),
});

// Password Reset Tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Categories
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'income' or 'expense'
  createdAt: timestamp("created_at").defaultNow(),
});

// Income
export const incomes = pgTable("incomes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  categoryId: integer("category_id").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Expenses
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  categoryId: integer("category_id").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Audit Logs
export const auditLogs = pgTable("audit_logs", {
  id: serial("audit_log_id").primaryKey(),
  userId: integer("user_fid").notNull(),
  action: text("audit_log_action").notNull(),
  entity: text("entity").notNull(),
  entityId: integer("entity_id"),
  details: text("audit_log_description"),
  createdAt: timestamp("created_timestamp").defaultNow(),
});

// Relations
export const incomesRelations = relations(incomes, ({ one }) => ({
  category: one(categories, {
    fields: [incomes.categoryId],
    references: [categories.id],
  }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  category: one(categories, {
    fields: [expenses.categoryId],
    references: [categories.id],
  }),
}));

// Schemas & Types
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true, createdAt: true });
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export const insertIncomeSchema = createInsertSchema(incomes).omit({ id: true, createdAt: true, userId: true });
export type Income = typeof incomes.$inferSelect;
export type InsertIncome = z.infer<typeof insertIncomeSchema>;

export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true, userId: true });
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

export type CategoryResponse = Category;
export type IncomeResponse = Income & { category?: Category };
export type ExpenseResponse = Expense & { category?: Category };
