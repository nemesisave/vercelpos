import { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureDbInitialized, sql } from '../_db.js';
import { CompletedOrder, OrderItem, RefundTransaction, User } from '../../types.js';
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
    return res.status(405).end('Method Not Allowed');
  }
  
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { originalInvoiceId, itemsToRefund, restock } = req.body as {
    originalInvoiceId: string;
    itemsToRefund: { id: number; quantity: number }[];
    restock: boolean;
  };

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Get original order
    const orderResult = await client.query('SELECT * FROM completed_orders WHERE "invoiceId" = $1', [originalInvoiceId]);
    if (orderResult.rows.length === 0) {
      throw new Error('Original order not found');
    }
    const order: CompletedOrder = orderResult.rows[0] as any;

    // 2. Calculate refund amount and create refund items
    let totalRefundAmount = 0;
    const refundItems: OrderItem[] = [];
    const baseCurrency = Object.keys(order.items[0].price)[0]; // Infer base currency from first item

    for (const item of itemsToRefund) {
      const orderItem = order.items.find(i => i.id === item.id);
      if (!orderItem) throw new Error(`Item ID ${item.id} not found in original order.`);
      
      const price = orderItem.price[baseCurrency] || 0;
      totalRefundAmount += price * item.quantity;
      refundItems.push({ ...orderItem, quantity: item.quantity });
    }

    // Adjust for tax proportionally
    const refundProportionOfSubtotal = order.subtotal > 0 ? (totalRefundAmount / (order.subtotal - order.discount)) : 0;
    const taxRefund = order.tax * refundProportionOfSubtotal;
    totalRefundAmount = totalRefundAmount + taxRefund;
    
    // 3. Update stock if required
    let updatedProducts: { id: number; stock: number }[] | undefined = undefined;
    if (restock) {
      updatedProducts = [];
      for (const item of itemsToRefund) {
        const updateResult = await client.query(
          'UPDATE products SET stock = stock + $1 WHERE id = $2 RETURNING id, stock;',
          [item.quantity, item.id]
        );
        updatedProducts.push(updateResult.rows[0] as { id: number; stock: number });
      }
    }

    // 4. Update order status and refund amount
    const newRefundAmount = (Number(order.refundAmount) || 0) + totalRefundAmount;
    const isFullyRefunded = Math.abs(newRefundAmount - order.total) < 0.01;
    const newStatus = isFullyRefunded ? 'Fully Refunded' : 'Partially Refunded';
    
    const updatedOrderResult = await client.query(
      'UPDATE completed_orders SET status = $1, "refundAmount" = $2 WHERE "invoiceId" = $3 RETURNING *;',
      [newStatus, newRefundAmount, originalInvoiceId]
    );
    const updatedOrder = updatedOrderResult.rows[0];

    // 5. Create refund transaction
    const refundId = `REF-${Date.now()}`;
    const newRefund: Omit<RefundTransaction, 'id'> = {
      originalInvoiceId,
      date: new Date().toISOString(),
      cashier: user.name,
      items: refundItems,
      totalRefundAmount,
      stockRestored: restock
    };
    
    const newRefundResult = await client.query(
      `INSERT INTO refund_transactions (id, "originalInvoiceId", date, cashier, items, "totalRefundAmount", "stockRestored")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *;`,
      [refundId, newRefund.originalInvoiceId, newRefund.date, newRefund.cashier, JSON.stringify(newRefund.items), newRefund.totalRefundAmount, newRefund.stockRestored]
    );

    await client.query(
      `INSERT INTO audit_logs (user_id, user_name, action, details)
       VALUES ($1, $2, 'PROCESS_REFUND', $3);`,
      [user.id, user.name, `Processed refund for order ${originalInvoiceId}, Amount: ${totalRefundAmount}`]
    );

    await client.query('COMMIT');
    res.status(200).json({ updatedOrder, newRefund: newRefundResult.rows[0], updatedProducts });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing refund:', error);
    res.status(500).json({ error: (error as Error).message });
  } finally {
      client.release();
  }
}
