import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_db.js';
import { OrderItem, BusinessSettings, PaymentMethod, CompletedOrder } from '../../types.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
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
  } = req.body as {
    orderItems: OrderItem[],
    businessSettings: BusinessSettings,
    cashierName: string,
    paymentMethod: PaymentMethod,
    tip: number,
    discount: number,
    customerId?: number | null,
    customerName?: string,
  };

  try {
    await sql`BEGIN`;

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
      const result = await sql`
        UPDATE products
        SET stock = stock - ${item.quantity}
        WHERE id = ${item.id} AND stock >= ${item.quantity}
        RETURNING id, stock;
      `;
      if (result.rowCount === 0) {
        throw new Error(`Insufficient stock for product ID ${item.id}`);
      }
      updatedProducts.push(result.rows[0] as { id: number; stock: number });
    }

    // 3. Create completed order
    const newOrder: Omit<CompletedOrder, 'invoiceId'> = {
        date: new Date().toLocaleString(),
        cashier: cashierName,
        items: orderItems,
        subtotal, tax, tip, discount, total, paymentMethod,
        status: 'Completed',
        customerId: customerId || null,
        customerName: customerName,
    };
    const invoiceId = `INV-${Date.now()}`;
    
    await sql`
        INSERT INTO completed_orders ("invoiceId", date, cashier, items, subtotal, tax, tip, discount, total, "paymentMethod", status, "customerId", "customerName")
        VALUES (${invoiceId}, ${newOrder.date}, ${newOrder.cashier}, ${JSON.stringify(newOrder.items)}, ${newOrder.subtotal}, ${newOrder.tax}, ${newOrder.tip}, ${newOrder.discount}, ${newOrder.total}, ${newOrder.paymentMethod}, ${newOrder.status}, ${newOrder.customerId}, ${newOrder.customerName});
    `;

    const fullNewOrder: CompletedOrder = { ...newOrder, invoiceId };

    // 4. Audit log
    await sql`
        INSERT INTO audit_log (action, entity, entity_id, after_state, metadata)
        VALUES ('CREATE', 'completed_order', ${invoiceId}, ${JSON.stringify(fullNewOrder)}, ${JSON.stringify({ cashier: cashierName }) });
    `;

    await sql`COMMIT`;

    res.status(200).json({ updatedProducts, newOrder: fullNewOrder });
  } catch (error) {
    await sql`ROLLBACK`;
    console.error('Error processing payment:', error);
    res.status(500).json({ error: (error as Error).message });
  }
}
