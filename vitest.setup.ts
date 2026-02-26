import { vi } from 'vitest';

// Ensure DATABASE_URL exists to prevent db import from throwing at module load.
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/testdb';

// Default mock for pg Pool to avoid real connections in tests that import server/db.ts
vi.mock('pg', () => {
  class DummyPool {
    constructor(..._args: any[]) {}
    connect() { return Promise.resolve({ release() {} }); }
    query(_q: any, _p?: any) { return Promise.resolve({ rows: [], rowCount: 0 }); }
    end() { return Promise.resolve(); }
  }
  return { default: { Pool: DummyPool } };
});
