import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureDbInitialized } from '../_db.js';
import { NewProductPayload } from '../../types.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  await ensureDbInitialized();
  if (req.method === 'POST') {
    try {
      const { name, price, purchasePrice, imageUrl, category, stock, sellBy } = req.body as NewProductPayload;
      
      if (!name || !category || !price || !purchasePrice || stock === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await sql`
          INSERT INTO products (name, price, "purchasePrice", "imageUrl", category, stock, "sellBy")
          VALUES (${name}, ${JSON.stringify(price)}, ${JSON.stringify(purchasePrice)}, ${imageUrl}, ${category}, ${stock}, ${sellBy})
          RETURNING *;
      `;
      const newProduct = result.rows[0];
      
      res.status(201).json(newProduct);
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}