import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureDbInitialized } from '../_db.js';
import { Role } from '../../types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureDbInitialized();
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const { id, name, permissions } = req.body as Omit<Role, 'descriptionKey'>;
    if (!id || !name || !permissions) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const descriptionKey = `roles.${id}Description`; // a sensible default
    
    const result = await sql`
      INSERT INTO roles (id, name, "descriptionKey", permissions)
      VALUES (${id}, ${name}, ${descriptionKey}, ${permissions as any})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        "descriptionKey" = EXCLUDED.descriptionKey,
        permissions = EXCLUDED.permissions
      RETURNING *;
    `;
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding role:', error);
    res.status(500).json({ error: (error as Error).message });
  }
}
