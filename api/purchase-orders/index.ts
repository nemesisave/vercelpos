import { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureDbInitialized, sql } from '../_db.js';
import { PurchaseOrderItem, User } from '../../types.js';
import { db } from '@vercel/postgres';

// Helper to get user from session
async function getAuthenticatedUser(req: VercelRequest): Promise<User | null> {
    const sessionId = req.cookies.session_id;
    if (!sessionId) return null;
    const sessionResult = await sql`SELECT user_id FROM auth_sessions WHERE id = ${sessionId} AND expires_at > NOW()`;
    if (sessionResult.rowCount === 0) return null;
    const userId = sessionResult.rows[0].user_id;
    const userResult = await sql`SELECT id, name, "roleId", username, "avatarUrl", status, "lastLogin" FROM users WHERE id = ${userId} AND "deleted_at" IS NULL`;
    if (userResult.rowCount === 0) return null;
    return userResult.rows[0] as User;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureDbInitialized();
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const client = await db.connect();
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
      [user.id, user.name, `Created PO ${poId} for supplier ${supplierName}`]
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
