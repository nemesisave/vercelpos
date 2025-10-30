import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureDbInitialized } from '../_db.js';
import { NewUserPayload } from '../../types.js';
import { db } from '@vercel/postgres';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureDbInitialized();
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    const { name, username, password, pin, roleId, creatorId, creatorName } = req.body as NewUserPayload;
    if (!name || !username || !password || !pin || !roleId || !creatorId || !creatorName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await client.query(
      `INSERT INTO users (name, username, password, pin, "roleId", "avatarUrl", status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       RETURNING id, name, username, pin, "roleId", "avatarUrl", status, "lastLogin";`,
      [name, username, password, pin, roleId, `https://i.pravatar.cc/150?u=${username}`]
    );
    const { password: _, ...newUser } = result.rows[0];

    await client.query(
      `INSERT INTO audit_logs (user_id, user_name, action, details)
       VALUES ($1, $2, 'CREATE_USER', $3);`,
      [creatorId, creatorName, `Created new user: ${newUser.name} (@${newUser.username})`]
    );

    await client.query('COMMIT');
    res.status(201).json(newUser);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding user:', error);
    if (error instanceof Error && (error as any).code === '23505' && (error as any).constraint === 'users_username_key') {
      return res.status(409).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: (error as Error).message });
  } finally {
    client.release();
  }
}