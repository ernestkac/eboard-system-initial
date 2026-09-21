import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'admarc_eboard',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  decimalNumbers: true
};

let pool = null;
let isMockMode = false;
let inMemoryStore = null;

/**
 * Initialize simulated memory database for testing / fallback when MySQL host is unavailable
 */
export function initInMemoryStore(initialData = {}) {
  isMockMode = true;
  inMemoryStore = {
    users: initialData.users || [],
    members: initialData.members || [],
    member_role_history: initialData.member_role_history || [],
    meetings: initialData.meetings || [],
    agenda_items: initialData.agenda_items || [],
    motions: initialData.motions || [],
    motion_eligible_voters: initialData.motion_eligible_voters || [],
    votes: initialData.votes || [],
    announcements: initialData.announcements || [],
    documents: initialData.documents || [],
    audit_logs: initialData.audit_logs || []
  };
  return inMemoryStore;
}

export function getInMemoryStore() {
  return inMemoryStore;
}

/**
 * Get MySQL connection pool or fallback simulated pool
 */
export function getPool() {
  if (isMockMode) {
    return createMockPool();
  }
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

/**
 * Executes a parameterized SQL query
 * @param {string} sql - SQL string with ? placeholders
 * @param {Array} params - Parameter array
 */
export async function query(sql, params = []) {
  if (isMockMode) {
    return mockQuery(sql, params);
  }
  try {
    const currentPool = getPool();
    const [rows, fields] = await currentPool.query(sql, params);
    return [rows, fields];
  } catch (error) {
    // If MySQL connection refused in dev/test, offer fallback or throw clear error
    if (error.code === 'ECONNREFUSED' || error.code === 'ER_ACCESS_DENIED_ERROR' || error.code === 'ENOTFOUND') {
      logger.warn(`Database connection failed (${error.code}). To use real MySQL, ensure MySQL server is running.`);
    }
    throw error;
  }
}

/**
 * Execute transactional operations
 * @param {Function} callback - Async function accepting connection (query, commit, rollback)
 */
export async function withTransaction(callback) {
  if (isMockMode) {
    const mockConnection = {
      query: (sql, params) => mockQuery(sql, params),
      beginTransaction: async () => {},
      commit: async () => {},
      rollback: async () => {},
      release: () => {}
    };
    return await callback(mockConnection);
  }

  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Test database connectivity
 */
export async function testConnection() {
  if (isMockMode) {
    return { connected: true, mode: 'in-memory-mock' };
  }
  try {
    const currentPool = getPool();
    const connection = await currentPool.getConnection();
    await connection.ping();
    connection.release();
    logger.info(`Successfully connected to MySQL database: ${dbConfig.database} at ${dbConfig.host}:${dbConfig.port}`);
    return { connected: true, mode: 'mysql' };
  } catch (error) {
    logger.warn(`MySQL connection test failed: ${error.message}`);
    return { connected: false, error: error.message, code: error.code };
  }
}

/**
 * Minimal mock query handler for memory driver when running tests without active MySQL daemon
 */
function mockQuery(sql, params) {
  // Normalize SQL
  const trimmed = sql.trim();
  const upper = trimmed.toUpperCase();

  // Basic mock responses based on SQL command
  if (upper.startsWith('SELECT 1') || upper.startsWith('SELECT NOW()')) {
    return [[{ 1: 1 }], []];
  }

  // Handle mock store operations
  // If memory store exists, route by table
  return [[], []];
}

function createMockPool() {
  return {
    query: (sql, params) => mockQuery(sql, params),
    getConnection: async () => ({
      query: (sql, params) => mockQuery(sql, params),
      beginTransaction: async () => {},
      commit: async () => {},
      rollback: async () => {},
      release: () => {},
      ping: async () => {}
    })
  };
}

export default {
  query,
  getPool,
  withTransaction,
  testConnection,
  initInMemoryStore,
  getInMemoryStore
};
