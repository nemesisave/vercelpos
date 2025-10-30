import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureDbInitialized } from '../_db.js';
import { ProductUpdatePayload } from '../../types.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  await ensureDbInitialized();
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
        
        const beforeStateResult = await sql`SELECT * FROM products WHERE id = ${id}`;
        if (beforeStateResult.rowCount === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        const currentProduct = beforeStateResult.rows[0];

        const newProductData = {
            name: updates.name ?? currentProduct.name,
            category: updates.category ?? currentProduct.category,
            imageUrl: updates.imageUrl ?? currentProduct.imageUrl,
            sellBy: updates.sellBy ?? currentProduct.sellBy,
            stock: updates.stock ?? currentProduct.stock,
            price: updates.price ?? currentProduct.price,
            purchasePrice: updates.purchasePrice ?? currentProduct.purchasePrice,
        };

        const updatedProductResult = await sql`
            UPDATE products SET
                name = ${newProductData.name},
                category = ${newProductData.category},
                "imageUrl" = ${newProductData.imageUrl},
                "sellBy" = ${newProductData.sellBy},
                stock = ${newProductData.stock},
                price = ${JSON.stringify(newProductData.price)},
                "purchasePrice" = ${JSON.stringify(newProductData.purchasePrice)}
            WHERE id = ${id}
            RETURNING *;
        `;
        const updatedProduct = updatedProductResult.rows[0];
        
        return res.status(200).json(updatedProduct);

    } else if (req.method === 'DELETE') {
        const beforeStateResult = await sql`SELECT * FROM products WHERE id = ${id}`;
        if (beforeStateResult.rowCount === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        await sql`DELETE FROM products WHERE id = ${id}`;
        
        return res.status(200).json({ success: true });
    } else {
        res.setHeader('Allow', ['PUT', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error(`Error processing product ${id}:`, error);
    return res.status(500).json({ error: (error as Error).message });
  }
}