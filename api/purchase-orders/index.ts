import { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureDbInitialized } from '../_db.js';
import { PurchaseOrderItem } from '../../types.js';
import { db } from '@vercel/postgres';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureDbInitialized();
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const client = await db.connect();
  try {
    const { supplierId, supplierName, items, totalCost, userId, userName } = req.body as {
      supplierId: number;
      supplierName: string;
      items: Omit<PurchaseOrderItem, 'quantityReceived'>[];
      totalCost: number;
      userId: number;
      userName: string;
    };

    if (!supplierId || !items || items.length === 0 || !userId || !userName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await client.query('BEGIN');

    const poId = `PO-${Date.now()}`;
    const fullItems: PurchaseOrderItem[] = items.map(item => ({ ...item, quantityReceived: 0 }));

    const result = await client.query(
      `INSERT INTO purchase_orders (id, "supplierId", "supplierName", date, items, "totalCost", status)
       VALUES ($1, $2, $3, $4, $5, $6, 'Ordered')
       RETURNING *;`,
      [poId, supplierId, supplierName, new Date().toISOString(), JSON.stringify(fullItems), totalCost]
    );
    const newPO = result.rows[0];

    await client.query(
      `INSERT INTO audit_logs (user_id, user_name, action, details)
       VALUES ($1, $2, 'CREATE_PURCHASE_ORDER', $3);`,
      [userId, userName, `Created PO ${poId} for supplier ${supplierName}`]
    );

    await client.query('COMMIT');
    res.status(201).json(newPO);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating purchase order:', error);
    res.status(500).json({ error: (error as Error).message });
  } finally {
    client.release();
  }
}