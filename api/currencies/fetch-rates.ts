import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  // Per instructions, this should not call an external service.
  // We can simulate updating the 'last updated' timestamp and return the current data.
  try {
    const newTimestamp = new Date().toISOString();
    
    const [currencies, businessSettings] = await Promise.all([
        sql`SELECT * FROM currencies ORDER BY code ASC`,
        sql`UPDATE business_settings SET "currencyRatesLastUpdated" = ${newTimestamp} WHERE id = 1 RETURNING *`
    ]);

    res.status(200).json({
      currencies: currencies.rows,
      businessSettings: businessSettings.rows[0],
    });
  } catch (error) {
    console.error('Error fetching currency rates from DB:', error);
    res.status(500).json({ error: (error as Error).message });
  }
}