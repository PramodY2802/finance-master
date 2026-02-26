import { z } from 'zod';
import {
  users,
  categories,
  incomes,
  expenses,
  insertCategorySchema,
  insertIncomeSchema,
  insertExpenseSchema,
} from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        200: z.object({ user: z.custom<typeof users.$inferSelect>(), token: z.string(), refreshToken: z.string() }),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout' as const,
      input: z.object({ refreshToken: z.string().optional() }),
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    refresh: {
      method: 'POST' as const,
      path: '/api/auth/refresh' as const,
      input: z.object({ token: z.string() }),
      responses: {
        200: z.object({ token: z.string() }),
        401: errorSchemas.unauthorized,
      },
    },
    forgotPassword: {
      method: 'POST' as const,
      path: '/api/auth/forgot-password' as const,
      input: z.object({ username: z.string() }),
      responses: {
        200: z.object({ message: z.string(), token: z.string().optional() }),
        404: errorSchemas.notFound,
      },
    },
    resetPassword: {
      method: 'POST' as const,
      path: '/api/auth/reset-password' as const,
      input: z.object({ token: z.string(), password: z.string() }),
      responses: {
        200: z.object({ message: z.string() }),
        400: errorSchemas.validation,
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      }
    }
  },
  dashboard: {
    stats: {
      method: 'GET' as const,
      path: '/api/dashboard' as const,
      responses: {
        200: z.object({
          totalBalance: z.string(),
          totalIncome: z.string(),
          totalExpense: z.string(),
          todayExpense: z.string(),
          monthlyExpense: z.string(),
          monthlyIncome: z.string(),
          expenseVsIncome: z.array(z.object({ date: z.string(), income: z.number(), expense: z.number() })),
          dailyExpense: z.array(z.object({ date: z.string(), amount: z.number() })),
          categoryExpense: z.array(z.object({ category: z.string(), amount: z.number() })),
        }),
        401: errorSchemas.unauthorized,
      },
    },
  },
  categories: {
    list: {
      method: 'GET' as const,
      path: '/api/categories' as const,
      responses: {
        200: z.array(z.custom<typeof categories.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/categories' as const,
      input: insertCategorySchema,
      responses: {
        201: z.custom<typeof categories.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/categories/:id' as const,
      input: insertCategorySchema.partial(),
      responses: {
        200: z.custom<typeof categories.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/categories/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  incomes: {
    list: {
      method: 'GET' as const,
      path: '/api/incomes' as const,
      input: z.object({ startDate: z.string().optional(), endDate: z.string().optional() }).optional(),
      responses: {
        200: z.array(z.custom<typeof incomes.$inferSelect>().and(z.object({ category: z.custom<typeof categories.$inferSelect>().optional() }))),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/incomes' as const,
      input: insertIncomeSchema.extend({
        amount: z.union([z.string(), z.number()]),
        date: z.union([z.string(), z.date()]),
      }),
      responses: {
        201: z.custom<typeof incomes.$inferSelect>(),
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/incomes/:id' as const,
      input: insertIncomeSchema.partial().extend({
        amount: z.union([z.string(), z.number()]).optional(),
        date: z.union([z.string(), z.date()]).optional(),
      }),
      responses: {
        200: z.custom<typeof incomes.$inferSelect>(),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/incomes/:id' as const,
      responses: {
        204: z.void(),
      },
    },
  },
  expenses: {
    list: {
      method: 'GET' as const,
      path: '/api/expenses' as const,
      input: z.object({ startDate: z.string().optional(), endDate: z.string().optional() }).optional(),
      responses: {
        200: z.array(z.custom<typeof expenses.$inferSelect>().and(z.object({ category: z.custom<typeof categories.$inferSelect>().optional() }))),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/expenses' as const,
      input: insertExpenseSchema.extend({
        amount: z.union([z.string(), z.number()]),
        date: z.union([z.string(), z.date()]),
      }),
      responses: {
        201: z.custom<typeof expenses.$inferSelect>(),
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/expenses/:id' as const,
      input: insertExpenseSchema.partial().extend({
        amount: z.union([z.string(), z.number()]).optional(),
        date: z.union([z.string(), z.date()]).optional(),
      }),
      responses: {
        200: z.custom<typeof expenses.$inferSelect>(),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/expenses/:id' as const,
      responses: {
        204: z.void(),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
