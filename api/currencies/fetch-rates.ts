import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureDbInitialized } from '../_db.js';
import { db } from '@vercel/postgres';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureDbInitialized();
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  const client = await db.connect();
  try {
    const apiRes = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!apiRes.ok) {
        throw new Error(`Failed to fetch rates from external API: ${apiRes.statusText}`);
    }
    const data = await apiRes.json();
    if (data.result !== 'success') {
        throw new Error('External currency API returned an error.');
    }

    const rates = data.rates;
    const newTimestamp = new Date().toISOString();

    await client.query('BEGIN');
    
    const dbCurrenciesResult = await client.query('SELECT code FROM currencies');
    for (const row of dbCurrenciesResult.rows) {
        const code = row.code;
        if (rates[code]) {
            await client.query('UPDATE currencies SET rate = $1 WHERE code = $2', [rates[code], code]);
        }
    }
    
    await client.query('UPDATE business_settings SET "currencyRatesLastUpdated" = $1 WHERE id = 1', [newTimestamp]);
    
    await client.query('COMMIT');
    
    const [currenciesResult, businessSettingsResult] = await Promise.all([
        sql`SELECT * FROM currencies ORDER BY code ASC`,
        sql`SELECT * FROM business_settings WHERE id = 1`
    ]);

    res.status(200).json({
      currencies: currenciesResult.rows,
      businessSettings: businessSettingsResult.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(console.error);
    console.error('Error fetching currency rates:', error);
    res.status(500).json({ error: (error as Error).message });
  } finally {
      client.release();
  }
}