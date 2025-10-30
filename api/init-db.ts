import { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureDbInitialized } from './_db.js';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  try {
    await ensureDbInitialized();
    return response.status(200).json({ message: 'Database initialization check complete.' });
  } catch (error) {
    console.error('Error initializing database:', error);
    return response.status(500).json({ error: (error as Error).message });
  }
}