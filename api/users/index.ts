import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureDbInitialized, writeAuditLog } from '../_db.js';
import { NewUserPayload, User } from '../../types.js';
import { db } from '@vercel/postgres';

// Helper to get user from session
async function getAuthenticatedUser(req: VercelRequest): Promise<User | null> {
    const sessionId = req.cookies.session_id;
    if (!sessionId) return null;
    const sessionResult = await sql`SELECT user_id FROM auth_sessions WHERE id = ${sessionId} AND expires_at > NOW()`;
    if ((sessionResult?.rowCount ?? 0) === 0) return null;
    const userId = sessionResult.rows[0].user_id;
    const userResult = await sql`SELECT id, name, "roleId", username, "avatarUrl", status, "lastLogin" FROM users WHERE id = ${userId} AND deleted_at IS NULL`;
    if ((userResult?.rowCount ?? 0) === 0) return null;
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

    // Check for existing active user with the same username
    const existingUserCheck = await client.query(
      `SELECT id FROM users WHERE username = $1 AND deleted_at IS NULL`,
      [username]
    );

    if ((existingUserCheck?.rowCount ?? 0) > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Username already exists' });
    }

    const result = await client.query(
      `INSERT INTO users (name, username, password, pin, "roleId", "avatarUrl", status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       RETURNING id, name, username, pin, "roleId", "avatarUrl", status, "lastLogin";`,
      [name, username, password, pin, roleId, `https://i.pravatar.cc/150?u=${username}`]
    );
    const newUser = result.rows[0];
    
    await writeAuditLog({
      userId: creator.id,
      userName: creator.name,
      action: 'CREATE_USER',
      entity: 'users',
      entityId: newUser.id,
      details: { name: newUser.name, username: newUser.username, roleId: newUser.roleId }
    });

    await client.query('COMMIT');
    const { password: _, ...safeUser } = newUser;
    res.status(201).json(safeUser);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding user:', error);
    res.status(500).json({ error: (error as Error).message });
  } finally {
    client.release();
  }
}