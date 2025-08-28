/**
 * Jest setup file for database-dependent tests
 * Sets up mock database connections and test data
 */

// Mock database interface for tests that need database dependencies
interface TestDatabase {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  clear(): Promise<void>;
  query(sql: string, params?: any[]): Promise<any[]>;
  insert(table: string, data: Record<string, any>): Promise<number>;
  update(table: string, data: Record<string, any>, where: Record<string, any>): Promise<number>;
  delete(table: string, where: Record<string, any>): Promise<number>;
}

class MockDatabase implements TestDatabase {
  private connected = false;
  private data = new Map<string, Record<string, any>[]>();
  private nextId = 1;

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async clear(): Promise<void> {
    this.data.clear();
    this.nextId = 1;
  }

  async query(sql: string, params?: any[]): Promise<any[]> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }
    
    // Simple mock query implementation
    // In a real implementation, you'd parse SQL and execute against mock data
    const lowerSql = sql.toLowerCase();
    
    if (lowerSql.includes('select')) {
      // Return mock data based on table name
      const match = sql.match(/from\s+(\w+)/i);
      const table = match ? match[1] : 'unknown';
      return this.data.get(table) || [];
    }
    
    return [];
  }

  async insert(table: string, data: Record<string, any>): Promise<number> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }
    
    const tableData = this.data.get(table) || [];
    const record = { id: this.nextId++, ...data };
    tableData.push(record);
    this.data.set(table, tableData);
    
    return record.id;
  }

  async update(table: string, data: Record<string, any>, where: Record<string, any>): Promise<number> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }
    
    const tableData = this.data.get(table) || [];
    let updated = 0;
    
    for (const record of tableData) {
      let matches = true;
      for (const [key, value] of Object.entries(where)) {
        if (record[key] !== value) {
          matches = false;
          break;
        }
      }
      
      if (matches) {
        Object.assign(record, data);
        updated++;
      }
    }
    
    return updated;
  }

  async delete(table: string, where: Record<string, any>): Promise<number> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }
    
    const tableData = this.data.get(table) || [];
    const initialLength = tableData.length;
    
    const filtered = tableData.filter(record => {
      for (const [key, value] of Object.entries(where)) {
        if (record[key] === value) {
          return false; // Remove this record
        }
      }
      return true; // Keep this record
    });
    
    this.data.set(table, filtered);
    return initialLength - filtered.length;
  }
}

declare global {
  var testDatabase: TestDatabase;
  var createFreshDatabase: () => Promise<TestDatabase>;
}

let globalTestDb: MockDatabase;

beforeAll(async () => {
  globalTestDb = new MockDatabase();
  await globalTestDb.connect();
  global.testDatabase = globalTestDb;
});

beforeEach(async () => {
  // Clear database before each test
  if (globalTestDb) {
    await globalTestDb.clear();
  }
});

afterAll(async () => {
  if (globalTestDb) {
    await globalTestDb.disconnect();
  }
});

// Helper function to create a fresh database instance
global.createFreshDatabase = async () => {
  const db = new MockDatabase();
  await db.connect();
  return db;
};

export { TestDatabase, MockDatabase };