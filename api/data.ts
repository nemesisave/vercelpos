import { VercelRequest, VercelResponse } from '@vercel/node';
import { InitialData } from '../types.js';
import { sql, schemaSql, seedInitialData } from './_db.js';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'GET') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Check if business_settings table exists as a proxy for schema initialization
    const tableCheck = await sql`
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE  table_schema = 'public'
            AND    table_name   = 'business_settings'
        );
    `;

    if (!tableCheck[0].exists) {
        console.log('Tables not found, initializing schema...');
        const statements = schemaSql.split(';').filter(s => s.trim());
        for (const statement of statements) {
            if (statement) {
                await sql(statement);
            }
        }
        await seedInitialData();
    }

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
    ] = await Promise.all([
      sql`SELECT * FROM products ORDER BY id ASC`,
      sql`SELECT * FROM users ORDER BY id ASC`,
      sql`SELECT * FROM roles ORDER BY id ASC`,
      sql`SELECT * FROM suppliers ORDER BY id ASC`,
      sql`SELECT * FROM customers ORDER BY id ASC`,
      sql`SELECT * FROM business_settings LIMIT 1`,
      sql`SELECT theme, language FROM app_settings WHERE id = 1`,
      sql`SELECT * FROM purchase_orders ORDER BY date DESC`,
      sql`SELECT * FROM completed_orders ORDER BY date DESC`,
      sql`SELECT * FROM refund_transactions ORDER BY date DESC`,
      sql`SELECT * FROM session_history ORDER BY id DESC`,
      sql`SELECT * FROM audit_logs ORDER BY id DESC`,
      sql`SELECT * FROM currencies ORDER BY code ASC`,
    ]);

    const appSettings = appSettingsResult.length > 0 ? appSettingsResult[0] : { theme: 'default', language: 'es' };

    const data: InitialData = {
      products: products as any,
      users: users as any,
      roles: roles as any,
      suppliers: suppliers as any,
      customers: customers as any,
      businessSettings: businessSettings[0] as any,
      appSettings: appSettings as any,
      purchaseOrders: purchaseOrders as any,
      completedOrders: completedOrders as any,
      refundTransactions: refundTransactions as any,
      sessionHistory: sessionHistory as any,
      auditLogs: auditLogs as any,
      currencies: currencies as any,
    };
    
    return response.status(200).json(data);
  } catch (error) {
    console.error('Error fetching initial data:', error);
    return response.status(500).json({ error: (error as Error).message });
  }
}