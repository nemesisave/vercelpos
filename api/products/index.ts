import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_db.js';
import { NewProductPayload } from '../../types.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method === 'POST') {
    try {
      const { name, price, purchasePrice, imageUrl, category, stock, sellBy } = req.body as NewProductPayload;
      
      if (!name || !category || !price || !purchasePrice || stock === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      try {
        await sql`BEGIN`;

        const result = await sql`
            INSERT INTO products (name, price, "purchasePrice", "imageUrl", category, stock, "sellBy")
            VALUES (${name}, ${JSON.stringify(price)}, ${JSON.stringify(purchasePrice)}, ${imageUrl}, ${category}, ${stock}, ${sellBy})
            RETURNING *;
        `;
        const newProduct = result.rows[0];
        
        // Audit log (simplified for brevity, a real app would get actor_id from session)
        await sql`
            INSERT INTO audit_log (action, entity, entity_id, after_state)
            VALUES ('CREATE', 'product', ${newProduct.id}, ${JSON.stringify(newProduct)});
        `;

        await sql`COMMIT`;
        
        res.status(201).json(newProduct);
      } catch (error) {
        await sql`ROLLBACK`;
        throw error;
      }
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
