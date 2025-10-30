import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureDbInitialized } from './_db.js';
import type { BusinessSettings } from '../types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureDbInitialized();
  if (req.method === 'PUT') {
    try {
      const settings = req.body as BusinessSettings;
      
      const result = await sql`
        UPDATE business_settings SET
            "businessName" = ${settings.businessName},
            "taxRate" = ${settings.taxRate},
            phone = ${settings.phone},
            address = ${settings.address},
            "taxId" = ${settings.taxId},
            currency = ${settings.currency},
            "defaultDisplayCurrency" = ${settings.defaultDisplayCurrency},
            "logoUrl" = ${settings.logoUrl},
            "receiptHeaderText" = ${settings.receiptHeaderText},
            "receiptFooterText" = ${settings.receiptFooterText},
            "receiptShowPhone" = ${settings.receiptShowPhone},
            "receiptShowAddress" = ${settings.receiptShowAddress},
            "receiptShowTaxId" = ${settings.receiptShowTaxId},
            "currencyRatesLastUpdated" = ${settings.currencyRatesLastUpdated}
        WHERE id = 1
        RETURNING *;
      `;
      
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Settings not found' });
      }

      res.status(200).json(result.rows[0]);

    } catch (error) {
      console.error('Error updating business settings:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  } else {
    res.setHeader('Allow', ['PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}