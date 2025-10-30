import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_db.js';
import { NewUserPayload } from '../../types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    try {
      const { name, username, password, pin, roleId } = req.body as NewUserPayload;
      if (!name || !username || !password || !pin || !roleId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await sql`
        INSERT INTO users (name, username, password, pin, "roleId", "avatarUrl", status)
        VALUES (${name}, ${username}, ${password}, ${pin}, ${roleId}, ${`https://i.pravatar.cc/150?u=${username}`}, 'active')
        RETURNING id, name, username, password, pin, "roleId", "avatarUrl", status, "lastLogin";
      `;
      const newUser = result.rows[0];

      await sql`
        INSERT INTO audit_logs ("userId", "userName", action, details)
        VALUES (${newUser.id}, ${newUser.name}, 'CREATE_USER', ${`Created new user: ${newUser.name} (@${newUser.username})`});
      `;

      res.status(201).json(newUser);
    } catch (error) {
      console.error('Error adding user:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
