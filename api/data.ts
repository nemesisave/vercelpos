import { VercelRequest, VercelResponse } from '@vercel/node';
import { InitialData } from '../types.js';
import { sql, ensureDbInitialized } from './_db.js';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'GET') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Ensure the database is initialized before fetching data
    await ensureDbInitialized();

    const [
      products,
      users,
      roles,
      suppliers,
      customers,
      businessSettings,
      appSettingsResult,
      purchaseOrders,
      completedOrders,
      refundTransactions,
      sessionHistory,
      auditLogs,
      currencies,
      parkedOrders,
    ] = await Promise.all([
      sql`SELECT * FROM products ORDER BY id ASC`,
      sql`SELECT * FROM users WHERE "deleted_at" IS NULL ORDER BY id ASC`,
      sql`SELECT * FROM roles ORDER BY id ASC`,
      sql`SELECT * FROM suppliers ORDER BY id ASC`,
      sql`SELECT * FROM customers ORDER BY id ASC`,
      sql`SELECT * FROM business_settings LIMIT 1`,
      sql`SELECT theme, language FROM app_settings WHERE id = 1`,
      sql`SELECT * FROM purchase_orders ORDER BY date DESC`,
      sql`SELECT * FROM completed_orders ORDER BY date DESC`,
      sql`SELECT * FROM refund_transactions ORDER BY date DESC`,
      sql`SELECT * FROM cash_drawer_sessions ORDER BY opened_at DESC`,
      sql`SELECT * FROM audit_logs ORDER BY id DESC`,
      sql`SELECT * FROM currencies ORDER BY code ASC`,
      sql`SELECT * FROM parked_orders ORDER BY "parkedAt" DESC`,
    ]);
    
    const appSettings = appSettingsResult.rows.length > 0 ? appSettingsResult.rows[0] : { theme: 'default', language: 'es' };

    const data: InitialData = {
      products: products.rows as any,
      users: users.rows as any,
      roles: roles.rows as any,
      suppliers: suppliers.rows as any,
      customers: customers.rows as any,
      businessSettings: businessSettings.rows[0] as any,
      appSettings: appSettings as any,
      purchaseOrders: purchaseOrders.rows as any,
      completedOrders: completedOrders.rows as any,
      refundTransactions: refundTransactions.rows as any,
      sessionHistory: sessionHistory.rows as any,
      auditLogs: auditLogs.rows as any,
      currencies: currencies.rows as any,
      parkedOrders: parkedOrders.rows as any,
    };
    
    return response.status(200).json(data);
  } catch (error) {
    console.error('Error fetching initial data:', error);
    return response.status(500).json({ error: (error as Error).message });
  }
}