import { VercelRequest, VercelResponse } from '@vercel/node';
// FIX: Module '"../_db.js"' has no exported member 'withTx'. Replaced with standard transaction client from '@vercel/postgres'.
import { ensureDbInitialized } from '../_db.js';
import { db } from '@vercel/postgres';
import { Currency } from '../../currencies.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).setHeader('Allow', 'PUT').end('Method Not Allowed');
  }

  await ensureDbInitialized();

  const currencies = req.body as Currency[];

  if (!Array.isArray(currencies)) {
    return res.status(400).json({ error: 'Request body must be an array of currency objects.' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    for (const currency of currencies) {
      await client.query(
        `INSERT INTO currencies (code, name, symbol, rate)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (code) DO UPDATE
         SET name = EXCLUDED.name,
             symbol = EXCLUDED.symbol,
             rate = EXCLUDED.rate;`,
        [currency.code, currency.name, currency.symbol, currency.rate]
      );
    }
    const result = await client.query('SELECT * FROM currencies ORDER BY code ASC;');
    const updatedCurrencies = result.rows;

    await client.query('COMMIT');
    res.status(200).json(updatedCurrencies);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating currencies:', error);
    res.status(500).json({ error: (error as Error).message });
  } finally {
    client.release();
  }
}
