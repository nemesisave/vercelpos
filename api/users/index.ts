import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureDbInitialized } from '../_db.js';
import { NewUserPayload, User } from '../../types.js';
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

  const creator = await getAuthenticatedUser(req);
  if (!creator) {
      return res.status(401).json({ error: "Unauthorized" });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    const { name, username, password, pin, roleId } = req.body as NewUserPayload;
    if (!name || !username || !password || !pin || !roleId ) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await client.query(
      `INSERT INTO users (name, username, password, pin, "roleId", "avatarUrl", status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       RETURNING id, name, username, pin, "roleId", "avatarUrl", status, "lastLogin";`,
      [name, username, password, pin, roleId, `https://i.pravatar.cc/150?u=${username}`]
    );
    const newUser = result.rows[0];
    delete newUser.password;

    await client.query(
      `INSERT INTO audit_logs (user_id, user_name, action, details)
       VALUES ($1, $2, 'CREATE_USER', $3);`,
      [creator.id, creator.name, `Created new user: ${newUser.name} (@${newUser.username})`]
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
