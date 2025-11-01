import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureDbInitialized } from '../_db.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    await ensureDbInitialized();

    const salesByCashierResult = await sql`
      SELECT 
        cashier, 
        SUM(total) as total_revenue, 
        COUNT("invoiceId") as total_sales 
      FROM completed_orders 
      GROUP BY cashier
      ORDER BY total_revenue DESC;
    `;

    const salesByHourResult = await sql`
      SELECT 
        EXTRACT(HOUR FROM date::timestamptz) as hour, 
        SUM(total) as total_revenue
      FROM completed_orders 
      GROUP BY hour 
      ORDER BY hour;
    `;

    // Initialize all hours with 0 revenue
    const salesByHour = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      total_revenue: 0,
    }));

    // Populate with actual data
    salesByHourResult.rows.forEach(row => {
      const hour = parseInt(row.hour, 10);
      if (hour >= 0 && hour < 24) {
        salesByHour[hour].total_revenue = parseFloat(row.total_revenue);
      }
    });

    res.status(200).json({
      salesByCashier: salesByCashierResult.rows,
      salesByHour,
    });
  } catch (error) {
    console.error('Error fetching dashboard details:', error);
    res.status(500).json({ error: (error as Error).message });
  }
}
