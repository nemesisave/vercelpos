import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_db.js';
import { ProductUpdatePayload } from '../../types.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid product ID' });
  }

  try {
    if (req.method === 'PUT') {
        const updates = req.body as ProductUpdatePayload;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No update fields provided' });
        }
        
        await sql`BEGIN`;
        const beforeState = await sql`SELECT * FROM products WHERE id = ${id}`;
        if (beforeState.length === 0) {
            await sql`ROLLBACK`;
            return res.status(404).json({ error: 'Product not found' });
        }
        const currentProduct = beforeState[0];

        const newProductData = {
            name: updates.name ?? currentProduct.name,
            category: updates.category ?? currentProduct.category,
            imageUrl: updates.imageUrl ?? currentProduct.imageUrl,
            sellBy: updates.sellBy ?? currentProduct.sellBy,
            stock: updates.stock ?? currentProduct.stock,
            price: updates.price ?? currentProduct.price,
            purchasePrice: updates.purchasePrice ?? currentProduct.purchasePrice,
        };

        const updatedProduct = await sql`
            UPDATE products SET
                name = ${newProductData.name},
                category = ${newProductData.category},
                "imageUrl" = ${newProductData.imageUrl},
                "sellBy" = ${newProductData.sellBy},
                stock = ${newProductData.stock},
                price = ${newProductData.price},
                "purchasePrice" = ${newProductData.purchasePrice}
            WHERE id = ${id}
            RETURNING *;
        `;
        
        await sql`
            INSERT INTO audit_log (action, entity, entity_id, before_state, after_state)
            VALUES ('UPDATE', 'product', ${id}, ${JSON.stringify(beforeState[0])}, ${JSON.stringify(updatedProduct[0])});
        `;
        await sql`COMMIT`;
        
        return res.status(200).json(updatedProduct[0]);

    } else if (req.method === 'DELETE') {
        await sql`BEGIN`;
        const beforeState = await sql`SELECT * FROM products WHERE id = ${id}`;
        if (beforeState.length === 0) {
            await sql`ROLLBACK`;
            return res.status(404).json({ error: 'Product not found' });
        }

        await sql`DELETE FROM products WHERE id = ${id}`;
        
        await sql`
            INSERT INTO audit_log (action, entity, entity_id, before_state)
            VALUES ('DELETE', 'product', ${id}, ${JSON.stringify(beforeState[0])});
        `;
        await sql`COMMIT`;

        return res.status(200).json({ success: true });
    } else {
        res.setHeader('Allow', ['PUT', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    // We might not have an active transaction if the error is early, so check before rollback.
    // A more robust solution might inspect the error type.
    try { await sql`ROLLBACK`; } catch (e) { /* ignore rollback errors */ }
    console.error(`Error processing product ${id}:`, error);
    return res.status(500).json({ error: (error as Error).message });
  }
}