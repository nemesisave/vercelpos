import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureDbInitialized } from '../_db.js';
import { OrderItem, BusinessSettings, PaymentMethod, CompletedOrder } from '../../types.js';
import { db } from '@vercel/postgres';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  await ensureDbInitialized();
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  const {
    orderItems,
    businessSettings,
    cashierName,
    paymentMethod,
    tip,
    discount,
    customerId,
    customerName,
    userId,
  } = req.body as {
    orderItems: OrderItem[],
    businessSettings: BusinessSettings,
    cashierName: string,
    paymentMethod: PaymentMethod,
    tip: number,
    discount: number,
    customerId?: number | null,
    customerName?: string,
    userId: number,
  };

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Calculate totals
    const subtotal = orderItems.reduce((acc, item) => {
      const price = item.price[businessSettings.currency] || 0;
      return acc + price * item.quantity;
    }, 0);
    const subtotalAfterDiscount = subtotal - discount;
    const tax = subtotalAfterDiscount * businessSettings.taxRate;
    const total = subtotalAfterDiscount + tax + tip;

    // 2. Update product stock
    const updatedProducts: { id: number; stock: number }[] = [];
    for (const item of orderItems) {
      const result = await client.query(
        `UPDATE products
         SET stock = stock - $1
         WHERE id = $2 AND stock >= $1
         RETURNING id, stock;`,
        [item.quantity, item.id]
      );
      if (result.rowCount === 0) {
        throw new Error(`Insufficient stock for product ID ${item.id}`);
      }
      updatedProducts.push(result.rows[0] as { id: number; stock: number });
    }

    // 3. Create completed order
    const newOrder: Omit<CompletedOrder, 'invoiceId'> = {
        date: new Date().toISOString(),
        cashier: cashierName,
        items: orderItems,
        subtotal, tax, tip, discount, total, paymentMethod,
        status: 'Completed',
        customerId: customerId || null,
        customerName: customerName,
    };
    const invoiceId = `INV-${Date.now()}`;
    
    await client.query(
      `INSERT INTO completed_orders ("invoiceId", date, cashier, items, subtotal, tax, tip, discount, total, "paymentMethod", status, "customerId", "customerName")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);`,
      [invoiceId, newOrder.date, newOrder.cashier, JSON.stringify(newOrder.items), newOrder.subtotal, newOrder.tax, newOrder.tip, newOrder.discount, newOrder.total, newOrder.paymentMethod, newOrder.status, newOrder.customerId, newOrder.customerName]
    );

    const fullNewOrder: CompletedOrder = { ...newOrder, invoiceId };

    // 4. Audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, user_name, action, details)
       VALUES ($1, $2, 'PROCESS_PAYMENT', $3);`,
      [userId, cashierName, `Processed payment for order ${invoiceId}, Total: ${fullNewOrder.total}`]
    );

    await client.query('COMMIT');
    res.status(200).json({ updatedProducts, newOrder: fullNewOrder });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing payment:', error);
    res.status(500).json({ error: (error as Error).message });
  } finally {
    client.release();
  }
}