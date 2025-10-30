import { VercelRequest, VercelResponse } from '@vercel/node';
import { withTx } from '../_db.js';
import { CompletedOrder, OrderItem, RefundTransaction } from '../../types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  const { originalInvoiceId, itemsToRefund, restock } = req.body as {
    originalInvoiceId: string;
    itemsToRefund: { id: number; quantity: number }[];
    restock: boolean;
  };

  try {
    const result = await withTx(async (tx) => {
      // 1. Get original order
      const orderResult = await tx`SELECT * FROM completed_orders WHERE "invoiceId" = ${originalInvoiceId}`;
      if (orderResult.rows.length === 0) {
        throw new Error('Original order not found');
      }
      const order: CompletedOrder = orderResult.rows[0] as any;

      // 2. Calculate refund amount and create refund items
      let totalRefundAmount = 0;
      const refundItems: OrderItem[] = [];
      for (const item of itemsToRefund) {
        const orderItem = order.items.find(i => i.id === item.id);
        if (!orderItem) throw new Error(`Item ID ${item.id} not found in original order.`);
        
        const price = orderItem.price[order.items[0].price ? Object.keys(order.items[0].price)[0] : 'USD'] || 0;
        totalRefundAmount += price * item.quantity;
        refundItems.push({ ...orderItem, quantity: item.quantity });
      }

      // Adjust for tax
      const taxRate = order.subtotal > 0 ? order.tax / (order.subtotal - (order.discount || 0)) : 0;
      totalRefundAmount = totalRefundAmount * (1 + taxRate);
      
      // 3. Update stock if required
      let updatedProducts: { id: number; stock: number }[] | undefined = undefined;
      if (restock) {
        updatedProducts = [];
        for (const item of itemsToRefund) {
          const updateResult = await tx`
            UPDATE products SET stock = stock + ${item.quantity} WHERE id = ${item.id} RETURNING id, stock;
          `;
          updatedProducts.push(updateResult.rows[0] as { id: number; stock: number });
        }
      }

      // 4. Update order status and refund amount
      const newRefundAmount = (order.refundAmount || 0) + totalRefundAmount;
      const isFullyRefunded = Math.abs(newRefundAmount - order.total) < 0.01;
      const newStatus = isFullyRefunded ? 'Fully Refunded' : 'Partially Refunded';
      
      const updatedOrderResult = await tx`
        UPDATE completed_orders
        SET status = ${newStatus}, "refundAmount" = ${newRefundAmount}
        WHERE "invoiceId" = ${originalInvoiceId}
        RETURNING *;
      `;
      const updatedOrder = updatedOrderResult.rows[0];

      // 5. Create refund transaction
      const refundId = `REF-${Date.now()}`;
      const newRefund: Omit<RefundTransaction, 'id'> = {
        originalInvoiceId,
        date: new Date().toLocaleString(),
        cashier: order.cashier, // Assuming same cashier, could be passed from frontend
        items: refundItems,
        totalRefundAmount,
        stockRestored: restock
      };
      
      const newRefundResult = await tx`
        INSERT INTO refund_transactions (id, "originalInvoiceId", date, cashier, items, "totalRefundAmount", "stockRestored")
        VALUES (${refundId}, ${newRefund.originalInvoiceId}, ${newRefund.date}, ${newRefund.cashier}, ${JSON.stringify(newRefund.items)}, ${newRefund.totalRefundAmount}, ${newRefund.stockRestored})
        RETURNING *;
      `;

      return { updatedOrder, newRefund: newRefundResult.rows[0], updatedProducts };
    });
    
    res.status(200).json(result);

  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ error: (error as Error).message });
  }
}
