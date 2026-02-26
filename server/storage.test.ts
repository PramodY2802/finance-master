import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock drizzle-orm helpers used by storage
vi.mock('drizzle-orm', () => ({
  eq: (a: any, b: any) => ({ type: 'eq', a, b }),
  and: (...conds: any[]) => ({ type: 'and', conds }),
  gte: (a: any, b: any) => ({ type: 'gte', a, b }),
  lte: (a: any, b: any) => ({ type: 'lte', a, b }),
  desc: (c: any) => ({ type: 'desc', c }),
  sql: (strings: TemplateStringsArray, ...values: any[]) => ({
    text: strings.join('?'),
    values,
  }),
}));

// Provide lightweight table objects to avoid importing shared/schema in tests
vi.mock('@shared/schema', () => ({
  users: { table: 'users' },
  refreshTokens: { token: 'token', userId: 'userId', expiresAt: 'expiresAt', access_token: 'access_token' },
  passwordResetTokens: { token: 'pr_token', userId: 'userId', expiresAt: 'expiresAt' },
  categories: { id: 'id' },
  incomes: { id: 'id', categoryId: 'categoryId', date: 'date' },
  expenses: { id: 'id', categoryId: 'categoryId', date: 'date' },
  auditLogs: {},
}));

// A mockable chainable query builder
function createQB(initialRows: any[] = []) {
  const state: any = { rows: initialRows, ops: [] };
  const qb: any = {
    select: vi.fn(() => qb),
    from: vi.fn(() => qb),
    leftJoin: vi.fn(() => qb),
    $dynamic: vi.fn(() => qb),
    where: vi.fn(() => qb),
    orderBy: vi.fn(async () => state.rows),
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn(async () => state.rows) })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn(async () => state.rows) })) })) })),
    delete: vi.fn(() => ({ where: vi.fn(async () => {}) })),
    returning: vi.fn(async () => state.rows),
  };
  return { qb, state };
}

// Mock db from server/db
const execMock = vi.fn();
const chainFactory = createQB();
vi.mock('./db', () => ({
  db: {
    execute: execMock,
    select: chainFactory.qb.select,
    from: chainFactory.qb.from,
    leftJoin: chainFactory.qb.leftJoin,
    $dynamic: chainFactory.qb.$dynamic,
    where: chainFactory.qb.where,
    orderBy: chainFactory.qb.orderBy,
    insert: chainFactory.qb.insert,
    update: chainFactory.qb.update,
    delete: chainFactory.qb.delete,
  },
}));

import { DatabaseStorage } from './storage';

describe('DatabaseStorage', () => {
  let storage: DatabaseStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new DatabaseStorage();
  });

  it('getUser should return undefined when no user found', async () => {
    execMock.mockResolvedValueOnce({ rows: [] });
    const res = await storage.getUser(1);
    expect(res).toBeUndefined();
    expect(execMock).toHaveBeenCalledWith(expect.objectContaining({ text: expect.any(String) }));
  });

  it('getUser should hydrate role when role exists', async () => {
    // user row
    execMock.mockResolvedValueOnce({ rows: [{ user_id: 1, user_name: 'u', user_fullname: 'U F', user_password: 'p', user_email: 'e', enterprise_fid: 9, created_timestamp: 'now' }] });
    // user_roles
    execMock.mockResolvedValueOnce({ rows: [{ role_fid: 2 }] });
    // roles
    execMock.mockResolvedValueOnce({ rows: [{ role_name: 'admin' }] });

    const res = await storage.getUser(1);
    expect(res).toEqual({
      id: 1,
      username: 'u',
      userFullName: 'U F',
      password: 'p',
      userEmail: 'e',
      enterpriseFid: 9,
      createdAt: 'now',
      role: 'admin',
    });
    expect(execMock).toHaveBeenCalledTimes(3);
  });

  it('getUserByUsername should return user with null role when mapping misses', async () => {
    execMock.mockResolvedValueOnce({ rows: [{ user_id: 2, user_name: 'john', user_fullname: 'John', user_password: 'hash', user_email: 'e', enterprise_fid: 1, created_timestamp: 't' }] });
    execMock.mockResolvedValueOnce({ rows: [] });

    const res = await storage.getUserByUsername('john');
    expect(res).toMatchObject({ id: 2, username: 'john', role: null });
  });

  it('verifyRefreshToken should return userId when token exists and not expired', async () => {
    const { qb, state } = createQB([{ userId: 5 }]);
    // override select chain for this test
    (await import('./db')).db.select = qb.select;
    (await import('./db')).db.from = qb.from;
    (await import('./db')).db.where = qb.where;
    const s = new DatabaseStorage();
    const res = await s.verifyRefreshToken('tok');
    expect(res).toEqual({ userId: 5 });
  });

  it('verifyRefreshToken should return undefined when no record', async () => {
    const { qb } = createQB([]);
    (await import('./db')).db.select = qb.select;
    (await import('./db')).db.from = qb.from;
    (await import('./db')).db.where = qb.where;
    const s = new DatabaseStorage();
    const res = await s.verifyRefreshToken('tok');
    expect(res).toBeUndefined();
  });

  it('getIncomes should apply date filter and map join results', async () => {
    const rows = [
      { incomes: { id: 1, date: new Date('2024-01-02') }, categories: { id: 7 } },
      { incomes: { id: 2, date: new Date('2024-01-01') }, categories: null },
    ];
    const { qb } = createQB(rows);
    (await import('./db')).db.select = qb.select;
    (await import('./db')).db.from = qb.from;
    (await import('./db')).db.leftJoin = qb.leftJoin;
    (await import('./db')).db.$dynamic = qb.$dynamic;
    (await import('./db')).db.where = qb.where;
    (await import('./db')).db.orderBy = qb.orderBy;

    const s = new DatabaseStorage();
    const res = await s.getIncomes('2024-01-01', '2024-01-31');
    expect(qb.where).toHaveBeenCalled();
    expect(res).toEqual([
      { id: 1, date: new Date('2024-01-02'), category: { id: 7 } },
      { id: 2, date: new Date('2024-01-01'), category: undefined },
    ]);
  });

  it('createExpense should call insert returning created row', async () => {
    const { qb, state } = createQB([{ id: 10, amount: 100 }]);
    (await import('./db')).db.insert = qb.insert;
    const s = new DatabaseStorage();
    const created = await s.createExpense({} as any);
    expect(created).toEqual({ id: 10, amount: 100 });
  });

  it('createRefreshToken should insert with access_token included', async () => {
    const insertSpy = vi.fn(() => ({ values: vi.fn(() => ({})) }));
    (await import('./db')).db.insert = insertSpy as any;
    const s = new DatabaseStorage();
    await s.createRefreshToken(1, 't', 'a', new Date());
    expect(insertSpy).toHaveBeenCalled();
    const args = insertSpy.mock.calls[0][0];
    expect(args).toBeDefined();
  });
});
