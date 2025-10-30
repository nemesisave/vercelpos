import { neon, neonConfig } from '@neondatabase/serverless';
import { db, sql as vercelSql, NeonQueryFunction } from '@vercel/postgres';
import {
  InitialData
} from '../types.js';
import { CURRENCIES as MOCK_CURRENCIES } from '../currencies.js';

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
}

// Use the vercelSql export for general queries, as it handles connection pooling.
export const sql = vercelSql;

/**
 * Executes a transaction block.
 * @param callback A function that receives a transactional client and executes queries.
 */
export async function withTx<T>(callback: (sql: NeonQueryFunction) => Promise<T>): Promise<T> {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client.sql);
        await client.query('COMMIT');
        return result;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}


export const schemaSql = `
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
    username TEXT UNIQUE,
    password TEXT,
    pin TEXT,
    "avatarUrl" TEXT,
    status TEXT,
    "lastLogin" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name TEXT,
    price JSONB,
    "purchasePrice" JSONB,
    "imageUrl" TEXT,
    category TEXT,
    stock NUMERIC,
    "sellBy" TEXT
);

CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name TEXT,
    "contactPerson" TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT
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
    "supplierId" INT REFERENCES suppliers(id),
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

CREATE TABLE IF NOT EXISTS session_history (
    id SERIAL PRIMARY KEY,
    "isOpen" BOOLEAN,
    "startingCash" NUMERIC,
    "openedBy" TEXT,
    "openedAt" TEXT,
    activities JSONB,
    "closingCash" NUMERIC,
    difference NUMERIC,
    "closedBy" TEXT,
    "closedAt" TEXT
);

CREATE TABLE IF NOT EXISTS parked_orders (
    id TEXT PRIMARY KEY,
    name TEXT,
    items JSONB,
    "parkedAt" TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    "timestamp" TIMESTAMPTZ DEFAULT NOW(),
    "userId" INT,
    "userName" TEXT,
    action TEXT,
    details TEXT
);
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
    { id: 1, name: 'Espresso', price: { USD: 2.50, MXN: 45.00, CLP: 2300 }, purchasePrice: { USD: 1.20, MXN: 22.00, CLP: 1100 }, imageUrl: 'https://picsum.photos/id/225/400/300', category: 'Coffee', stock: 50, sellBy: 'unit' },
    { id: 2, name: 'Latte', price: { USD: 3.50, MXN: 65.00, CLP: 3200 }, purchasePrice: { USD: 1.50, MXN: 28.00, CLP: 1400 }, imageUrl: 'https://picsum.photos/id/312/400/300', category: 'Coffee', stock: 50, sellBy: 'unit' },
    { id: 3, name: 'Cappuccino', price: { USD: 3.50, MXN: 65.00, CLP: 3200 }, purchasePrice: { USD: 1.50, MXN: 28.00, CLP: 1400 }, imageUrl: 'https://picsum.photos/id/326/400/300', category: 'Coffee', stock: 45, sellBy: 'unit' },
    { id: 7, name: 'Croissant', price: { USD: 2.75, MXN: 50.00, CLP: 2500 }, purchasePrice: { USD: 1.10, MXN: 20.00, CLP: 1000 }, imageUrl: 'https://picsum.photos/id/204/400/300', category: 'Pastries', stock: 30, sellBy: 'unit' },
    { id: 15, name: 'Colombian Coffee Beans', price: { USD: 22.00, MXN: 400.00, CLP: 20000 }, purchasePrice: { USD: 10.50, MXN: 190.00, CLP: 9500 }, imageUrl: 'https://picsum.photos/id/225/400/300', category: 'Coffee Beans', stock: 15.5, sellBy: 'weight' },
];

const MOCK_SUPPLIERS = [
    { id: 1, name: 'Supreme Coffee Roasters', contactPerson: 'Sarah Chen', phone: '555-0101', email: 'sarah.c@supremecoffee.com', address: '123 Roast St, Bean Town', notes: 'Weekly delivery on Tuesdays' },
    { id: 2, name: 'Patisserie Deluxe', contactPerson: 'Pierre Dubois', phone: '555-0102', email: 'orders@patisseriedeluxe.com', address: '45 Flour Ln, Pastryville', notes: '' },
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
        await sql`INSERT INTO users (name, "roleId", username, password, pin, "avatarUrl", status) VALUES (${user.name}, ${user.roleId}, ${user.username}, ${user.password}, ${user.pin}, ${user.avatarUrl}, ${user.status}) ON CONFLICT (username) DO NOTHING;`;
    }

    for (const product of MOCK_PRODUCTS) {
        await sql`INSERT INTO products (name, price, "purchasePrice", "imageUrl", category, stock, "sellBy") VALUES (${product.name}, ${JSON.stringify(product.price)}, ${JSON.stringify(product.purchasePrice)}, ${product.imageUrl}, ${product.category}, ${product.stock}, ${product.sellBy}) ON CONFLICT (name) DO NOTHING;`;
    }

    for (const supplier of MOCK_SUPPLIERS) {
        await sql`INSERT INTO suppliers (name, "contactPerson", phone, email, address, notes) VALUES (${supplier.name}, ${supplier.contactPerson}, ${supplier.phone}, ${supplier.email}, ${supplier.address}, ${supplier.notes}) ON CONFLICT (id) DO NOTHING;`;
    }
}
