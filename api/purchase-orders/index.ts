import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_db.js';
import { PurchaseOrderItem } from '../../types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    try {
      const { supplierId, supplierName, items, totalCost } = req.body as {
        supplierId: number;
        supplierName: string;
        items: Omit<PurchaseOrderItem, 'quantityReceived'>[];
        totalCost: number;
      };

      if (!supplierId || !items || items.length === 0) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const poId = `PO-${Date.now()}`;
      const fullItems: PurchaseOrderItem[] = items.map(item => ({ ...item, quantityReceived: 0 }));

      const result = await sql`
        INSERT INTO purchase_orders (id, "supplierId", "supplierName", date, items, "totalCost", status)
        VALUES (${poId}, ${supplierId}, ${supplierName}, ${new Date().toLocaleDateString()}, ${JSON.stringify(fullItems)}, ${totalCost}, 'Ordered')
        RETURNING *;
      `;
      
      res.status(201).json(result.rows[0]);

    } catch (error) {
      console.error('Error creating purchase order:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}