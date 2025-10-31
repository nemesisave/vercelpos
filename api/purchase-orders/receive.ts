import { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureDbInitialized } from '../_db.js';
import { db } from '@vercel/postgres';
import { PurchaseOrder, PurchaseOrderItem } from '../../types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureDbInitialized();
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  const { purchaseOrderId, receivedQuantities } = req.body as {
    purchaseOrderId: string;
    receivedQuantities: Record<number, number>;
  };

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Get the current PO
    const poResult = await client.query('SELECT * FROM purchase_orders WHERE id = $1', [purchaseOrderId]);
    if (poResult.rows.length === 0) {
      throw new Error('Purchase order not found');
    }
    const po: PurchaseOrder = poResult.rows[0] as any;

    // 2. Update product stock and PO items
    const updatedItems: PurchaseOrderItem[] = [];
    const updatedProducts: { id: number; stock: number }[] = [];
    let allItemsReceived = true;

    for (const item of po.items) {
      const receivedQty = receivedQuantities[item.productId] || 0;
      if (receivedQty > 0) {
        // Update product stock
        const productUpdateResult = await client.query(
          `UPDATE products
           SET stock = stock + $1
           WHERE id = $2
           RETURNING id, stock;`,
          [receivedQty, item.productId]
        );
        updatedProducts.push(productUpdateResult.rows[0] as { id: number; stock: number });
      }

      const newItem = { ...item, quantityReceived: item.quantityReceived + receivedQty };
      updatedItems.push(newItem);

      if (newItem.quantityReceived < newItem.quantity) {
        allItemsReceived = false;
      }
    }

    // 3. Determine new PO status
    const newStatus = allItemsReceived ? 'Received' : 'Partially Received';

    // 4. Update the PO
    const updatedPOResult = await client.query(
      `UPDATE purchase_orders
       SET items = $1, status = $2
       WHERE id = $3
       RETURNING *;`,
      [JSON.stringify(updatedItems), newStatus, purchaseOrderId]
    );
    const updatedPO = updatedPOResult.rows[0];

    await client.query('COMMIT');
    res.status(200).json({ updatedPO, updatedProducts });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error receiving stock:', error);
    res.status(500).json({ error: (error as Error).message });
  } finally {
    client.release();
  }
}