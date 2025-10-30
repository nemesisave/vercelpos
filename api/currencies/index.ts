import { VercelRequest, VercelResponse } from '@vercel/node';
import { withTx, ensureDbInitialized, sql } from '../_db.js';
// FIX: The Currency type should be imported from currencies.js, not types.js
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

  try {
    const updatedCurrencies = await withTx(async (tx) => {
      for (const currency of currencies) {
        await tx`
          INSERT INTO currencies (code, name, symbol, rate)
          VALUES (${currency.code}, ${currency.name}, ${currency.symbol}, ${currency.rate})
          ON CONFLICT (code) DO UPDATE
          SET name = EXCLUDED.name,
              symbol = EXCLUDED.symbol,
              rate = EXCLUDED.rate;
        `;
      }
      const result = await tx`SELECT * FROM currencies ORDER BY code ASC;`;
      return result.rows;
    });

    res.status(200).json(updatedCurrencies);
  } catch (error) {
    console.error('Error updating currencies:', error);
    res.status(500).json({ error: (error as Error).message });
  }
}
