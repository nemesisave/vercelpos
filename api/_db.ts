import { sql as vercelSql } from '@vercel/postgres';
import {
  InitialData
} from '../types.js';
import { CURRENCIES as MOCK_CURRENCIES } from '../currencies.js';

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
}

// Use the vercelSql export for general queries, as it handles connection pooling.
export const sql = vercelSql;

export async function writeSessionHistory(entry: {
  userId: number;
  drawerSessionId?: number;
  action: string;
  amount?: number | null;
  openingAmount?: number | null;
  closingAmount?: number | null;
  difference?: number | null;
  notes?: string | null;
}) {
  const {
    userId,
    drawerSessionId = null,
    action,
    amount = null,
    openingAmount = null,
    closingAmount = null,
    difference = null,
    notes = null,
  } = entry;

  try {
    await sql`
      INSERT INTO session_history (
        user_id,
        drawer_session_id,
        action,
        amount,
        opening_amount,
        closing_amount,
        difference,
        notes
      )
      VALUES (
        ${userId},
        ${drawerSessionId},
        ${action},
        ${amount},
        ${openingAmount},
        ${closingAmount},
        ${difference},
        ${notes}
      )
    `;
  } catch (e) {
    console.error("Failed to write session history:", e);
    // Don't re-throw, this is an audit/log table
  }
}

export async function writeAuditLog(opts: {
  userId?: number;
  userName?: string;
  action: string;
  entity?: string;
  entityId?: string | number;
  details?: any;
}) {
  const { userId, userName, action, entity, entityId, details } = opts;
  try {
      await sql`
        INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, details)
        VALUES (
          ${userId ?? null},
          ${userName ?? null},
          ${action},
          ${entity ?? null},
          ${entityId ? String(entityId) : null},
          ${details ? JSON.stringify(details) : null}
        )
      `;
  } catch (e) {
      console.error("Failed to write audit log:", e);
      // Don't throw error from here, as it might interrupt a critical transaction.
  }
}

export const schemaSql = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS business_settings (
    id SERIAL PRIMARY KEY,
    "businessName" TEXT,
    "taxRate" NUMERIC,
    phone TEXT,
    address TEXT,
    "taxId" TEXT,
    currency TEXT,
    "defaultDisplayCurrency" TEXT,
    "logoUrl" TEXT,
    "receiptHeaderText" TEXT,
    "receiptFooterText" TEXT,
    "receiptShowPhone" BOOLEAN,
    "receiptShowAddress" BOOLEAN,
    "receiptShowTaxId" BOOLEAN,
    "currencyRatesLastUpdated" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS app_settings (
    id INT PRIMARY KEY,
    theme TEXT DEFAULT 'default',
    language TEXT DEFAULT 'es'
);

CREATE TABLE IF NOT EXISTS currencies (
    code TEXT PRIMARY KEY,
    name TEXT,
    symbol TEXT,
    rate NUMERIC
);

CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT,
    "descriptionKey" TEXT,
    permissions TEXT[]
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT,
    "roleId" TEXT REFERENCES roles(id),
    username TEXT,
    password TEXT,
    pin TEXT,
    "avatarUrl" TEXT,
    status TEXT,
    "lastLogin" TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE,
    price JSONB,
    "purchasePrice" JSONB,
    "imageUrl" TEXT,
    category TEXT,
    stock NUMERIC,
    "sellBy" TEXT,
    barcode TEXT,
    low_stock_threshold NUMERIC(14,4) DEFAULT 10
);

CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE,
    "contactPerson" TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    lead_time_days INTEGER
);

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    "supplierId" INT REFERENCES suppliers(id) ON DELETE RESTRICT,
    "supplierName" TEXT,
    date TEXT,
    items JSONB,
    "totalCost" NUMERIC,
    status TEXT
);

CREATE TABLE IF NOT EXISTS completed_orders (
    "invoiceId" TEXT PRIMARY KEY,
    date TEXT,
    cashier TEXT,
    items JSONB,
    subtotal NUMERIC,
    tax NUMERIC,
    tip NUMERIC,
    discount NUMERIC,
    total NUMERIC,
    "paymentMethod" TEXT,
    status TEXT,
    "refundAmount" NUMERIC,
    "customerId" INT,
    "customerName" TEXT
);

CREATE TABLE IF NOT EXISTS refund_transactions (
    id TEXT PRIMARY KEY,
    "originalInvoiceId" TEXT,
    date TEXT,
    cashier TEXT,
    items JSONB,
    "totalRefundAmount" NUMERIC,
    "stockRestored" BOOLEAN
);

CREATE TABLE IF NOT EXISTS cash_drawer_sessions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opening_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_amount NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'open',
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  opened_by TEXT,
  closed_by TEXT,
  difference NUMERIC
);

CREATE TABLE IF NOT EXISTS cash_drawer_activity (
  id SERIAL PRIMARY KEY,
  session_id INT NOT NULL REFERENCES cash_drawer_sessions(id) ON DELETE CASCADE,
  user_id INT NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  notes TEXT,
  order_id TEXT,
  payment_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS session_history (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  drawer_session_id INT NULL,
  action TEXT NOT NULL,
  amount NUMERIC(12,2) NULL,
  opening_amount NUMERIC(12,2) NULL,
  closing_amount NUMERIC(12,2) NULL,
  difference NUMERIC(12,2) NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS parked_orders (
    id TEXT PRIMARY KEY,
    name TEXT,
    items JSONB,
    "parkedAt" TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INT NULL,
  user_name TEXT,
  action TEXT NOT NULL,
  entity TEXT NULL,
  entity_id TEXT NULL,
  details JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_logs (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id),
  user_id INT NULL,
  change_amount NUMERIC(14,4) NOT NULL,
  new_stock NUMERIC(14,4) NOT NULL,
  reason TEXT NOT NULL,
  reference_id TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_completed_orders_date ON completed_orders(date DESC);
CREATE INDEX IF NOT EXISTS idx_completed_orders_cashier ON completed_orders(cashier);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_product_id ON inventory_logs(product_id);
`;

const MOCK_ROLES = [
    { id: 'admin', name: 'Admin', descriptionKey: 'roles.adminDescription', permissions: ['CAN_PROCESS_PAYMENTS', 'CAN_VIEW_DASHBOARD_REPORTS', 'CAN_VIEW_SALES_HISTORY', 'CAN_VIEW_INVENTORY', 'CAN_MANAGE_INVENTORY_STOCK_PRICES', 'CAN_ADD_PRODUCTS', 'CAN_EDIT_DELETE_PRODUCTS', 'CAN_PERFORM_STOCK_COUNT', 'CAN_MANAGE_SUPPLIERS_AND_POs', 'CAN_MANAGE_USERS_AND_ROLES', 'CAN_MANAGE_CUSTOMERS', 'CAN_MANAGE_CASH_DRAWER', 'CAN_MANAGE_BUSINESS_SETTINGS'] },
    { id: 'cashier', name: 'Cashier', descriptionKey: 'roles.cashierDescription', permissions: ['CAN_PROCESS_PAYMENTS','CAN_VIEW_INVENTORY','CAN_MANAGE_CASH_DRAWER'] }
];

const MOCK_USERS = [
    { id: 1, name: 'Admin', roleId: 'admin', username: 'admin', password: 'admin123', pin: '1234', avatarUrl: 'https://i.pravatar.cc/150?u=admin', status: 'active', lastLogin: new Date().toISOString() },
    { id: 2, name: 'Jane Smith', roleId: 'cashier', username: 'jane', password: 'password', pin: '5678', avatarUrl: 'https://i.pravatar.cc/150?u=jane', status: 'active' },
];

const MOCK_PRODUCTS = [
    { id: 1, name: 'Espresso', price: { USD: 2.50, MXN: 45.00, CLP: 2300 }, purchasePrice: { USD: 1.20, MXN: 22.00, CLP: 1100 }, imageUrl: 'https://picsum.photos/id/225/400/300', category: 'Coffee', stock: 50, sellBy: 'unit', barcode: '100001' },
    { id: 2, name: 'Latte', price: { USD: 3.50, MXN: 65.00, CLP: 3200 }, purchasePrice: { USD: 1.50, MXN: 28.00, CLP: 1400 }, imageUrl: 'https://picsum.photos/id/312/400/300', category: 'Coffee', stock: 50, sellBy: 'unit', barcode: '100002' },
    { id: 3, name: 'Cappuccino', price: { USD: 3.50, MXN: 65.00, CLP: 3200 }, purchasePrice: { USD: 1.50, MXN: 28.00, CLP: 1400 }, imageUrl: 'https://picsum.photos/id/326/400/300', category: 'Coffee', stock: 45, sellBy: 'unit', barcode: '100003' },
    { id: 7, name: 'Croissant', price: { USD: 2.75, MXN: 50.00, CLP: 2500 }, purchasePrice: { USD: 1.10, MXN: 20.00, CLP: 1000 }, imageUrl: 'https://picsum.photos/id/204/400/300', category: 'Pastries', stock: 30, sellBy: 'unit', barcode: '100007' },
    { id: 15, name: 'Colombian Coffee Beans', price: { USD: 22.00, MXN: 400.00, CLP: 20000 }, purchasePrice: { USD: 10.50, MXN: 190.00, CLP: 9500 }, imageUrl: 'https://picsum.photos/id/225/400/300', category: 'Coffee Beans', stock: 15.5, sellBy: 'weight', barcode: '100015' },
];

const MOCK_SUPPLIERS = [
    { id: 1, name: 'Supreme Coffee Roasters', contactPerson: 'Sarah Chen', phone: '555-0101', email: 'sarah.c@supremecoffee.com', address: '123 Roast St, Bean Town', notes: 'Weekly delivery on Tuesdays', lead_time_days: 3 },
    { id: 2, name: 'Patisserie Deluxe', contactPerson: 'Pierre Dubois', phone: '555-0102', email: 'orders@patisseriedeluxe.com', address: '45 Flour Ln, Pastryville', notes: '', lead_time_days: 2 },
];

const MOCK_BUSINESS_SETTINGS = {
  businessName: 'Gemini Coffee Co.',
  taxRate: 0.08,
  phone: '555-123-4567',
  address: '123 Gemini Way, Silicon Valley, CA 94043',
  taxId: 'US-123456789',
  currency: 'USD',
  logoUrl: 'https://picsum.photos/seed/logo/200/100',
  receiptHeaderText: 'Thanks for visiting Gemini Coffee Co.!',
  receiptFooterText: 'Find us online @ geminicoffee.dev',
  receiptShowAddress: true,
  receiptShowPhone: true,
  receiptShowTaxId: false,
  currencyRatesLastUpdated: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
};

export async function seedInitialData() {
    await sql`
        INSERT INTO business_settings (id, "businessName", "taxRate", phone, address, "taxId", currency, "logoUrl", "receiptHeaderText", "receiptFooterText", "receiptShowAddress", "receiptShowPhone", "receiptShowTaxId", "currencyRatesLastUpdated")
        VALUES (1, ${MOCK_BUSINESS_SETTINGS.businessName}, ${MOCK_BUSINESS_SETTINGS.taxRate}, ${MOCK_BUSINESS_SETTINGS.phone}, ${MOCK_BUSINESS_SETTINGS.address}, ${MOCK_BUSINESS_SETTINGS.taxId}, ${MOCK_BUSINESS_SETTINGS.currency}, ${MOCK_BUSINESS_SETTINGS.logoUrl}, ${MOCK_BUSINESS_SETTINGS.receiptHeaderText}, ${MOCK_BUSINESS_SETTINGS.receiptFooterText}, ${MOCK_BUSINESS_SETTINGS.receiptShowAddress}, ${MOCK_BUSINESS_SETTINGS.receiptShowPhone}, ${MOCK_BUSINESS_SETTINGS.receiptShowTaxId}, ${MOCK_BUSINESS_SETTINGS.currencyRatesLastUpdated})
        ON CONFLICT (id) DO NOTHING;
    `;
    
    await sql`INSERT INTO app_settings (id, theme, language) VALUES (1, 'default', 'es') ON CONFLICT (id) DO NOTHING;`;

    for (const currency of MOCK_CURRENCIES) {
        await sql`INSERT INTO currencies (code, name, symbol, rate) VALUES (${currency.code}, ${currency.name}, ${currency.symbol}, ${currency.rate}) ON CONFLICT (code) DO NOTHING;`;
    }
    
    for (const role of MOCK_ROLES) {
        await sql`INSERT INTO roles (id, name, "descriptionKey", permissions) VALUES (${role.id}, ${role.name}, ${role.descriptionKey}, ${role.permissions as any}) ON CONFLICT (id) DO NOTHING;`;
    }

    for (const user of MOCK_USERS) {
        const existing = await sql`SELECT id FROM users WHERE username = ${user.username} AND deleted_at IS NULL LIMIT 1`;
        if ((existing?.rowCount ?? 0) === 0) {
           await sql`INSERT INTO users (name, "roleId", username, password, pin, "avatarUrl", status) VALUES (${user.name}, ${user.roleId}, ${user.username}, ${user.password}, ${user.pin}, ${user.avatarUrl}, ${user.status})`;
        }
    }

    for (const product of MOCK_PRODUCTS) {
        await sql`INSERT INTO products (name, price, "purchasePrice", "imageUrl", category, stock, "sellBy", barcode) VALUES (${product.name}, ${JSON.stringify(product.price)}, ${JSON.stringify(product.purchasePrice)}, ${product.imageUrl}, ${product.category}, ${product.stock}, ${product.sellBy}, ${product.barcode}) ON CONFLICT (name) DO NOTHING;`;
    }

    for (const supplier of MOCK_SUPPLIERS) {
        await sql`INSERT INTO suppliers (name, "contactPerson", phone, email, address, notes, lead_time_days) VALUES (${supplier.name}, ${supplier.contactPerson}, ${supplier.phone}, ${supplier.email}, ${supplier.address}, ${supplier.notes}, ${supplier.lead_time_days}) ON CONFLICT (name) DO NOTHING;`;
    }
}

let isDbInitialized = false;

export async function ensureDbInitialized() {
  if (isDbInitialized) {
    return;
  }

  try {
    console.log('Ensuring database is initialized...');
    const statements = schemaSql.split(';').filter(s => s.trim());
    for (const statement of statements) {
        if (statement) {
            await sql.query(statement);
        }
    }

    // Idempotent migrations/patches for existing databases
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;`;
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode TEXT;`;
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold NUMERIC(14,4) DEFAULT 10;`;
    await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS lead_time_days INTEGER;`;
    
    // Drop old unique constraint and create a partial unique index for usernames
    await sql`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;`;
    await sql`DROP INDEX IF EXISTS users_username_unique_when_not_deleted;`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique_when_not_deleted ON users (username) WHERE deleted_at IS NULL;`;

    // Add unique constraint to product names if not exists
    const hasPnameC = await sql`SELECT 1 FROM pg_constraint WHERE conname = 'products_name_key'`;
    if ((hasPnameC?.rowCount ?? 0) === 0) {
      await sql`ALTER TABLE products ADD CONSTRAINT products_name_key UNIQUE (name);`;
    }
    
    // Add unique constraint to supplier names if not exists
    const hasSnameC = await sql`SELECT 1 FROM pg_constraint WHERE conname = 'suppliers_name_key'`;
     if ((hasSnameC?.rowCount ?? 0) === 0) {
      await sql`ALTER TABLE suppliers ADD CONSTRAINT suppliers_name_key UNIQUE (name);`;
    }

    const hasCashDrawerIndex = await sql`SELECT 1 FROM pg_indexes WHERE indexname = 'cash_drawer_user_open_idx'`;
    if ((hasCashDrawerIndex?.rowCount ?? 0) === 0) {
        await sql`
            CREATE UNIQUE INDEX cash_drawer_user_open_idx
            ON cash_drawer_sessions (user_id)
            WHERE status = 'open';
        `;
    }
    
    await seedInitialData();
    isDbInitialized = true;
    console.log('Database initialization check complete.');
  } catch (error) {
    console.error('Error during database initialization:', error);
    throw error;
  }
}