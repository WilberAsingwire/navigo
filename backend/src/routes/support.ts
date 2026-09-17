import express, { Request, Response } from 'express';
import { getDB } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/authMiddleware';

const router = express.Router();

// ─── USER: CREATE TICKET ────────────────────────────
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { type, description, priority } = req.body;
    const db = getDB();
    const userId = (req as AuthRequest).user?.userId;

    if (!type || !description) {
      return res.status(400).json({ message: 'Type and description are required' });
    }

    const result = await db.run(
      'INSERT INTO support_tickets (userId, type, description, priority) VALUES (?, ?, ?, ?) RETURNING id',
      [userId, type, description, priority || 'medium']
    );

    res.status(201).json({ message: 'Ticket created successfully', ticketId: result.rows[0]?.id });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ message: 'Failed to create ticket' });
  }
});

// ─── ADMIN: GET ALL TICKETS ─────────────────────────
router.get('/admin/tickets', authenticate, authorize(['admin']), async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const tickets = await db.all(`
      SELECT t.*, u.fullName as userName, u.role as userRole
      FROM support_tickets t
      JOIN users u ON t.userId = u.id
      ORDER BY t.createdAt DESC
    `);

    const ticketsWithReplies = await Promise.all(tickets.map(async (t) => {
      const replies = await db.all('SELECT fromUser as from, message as text, createdAt as time FROM support_replies WHERE ticketId = ? ORDER BY createdAt ASC', [t.id]);
      return { ...t, replies };
    }));

    res.json(ticketsWithReplies);
  } catch (error) {
    console.error('Fetch tickets error:', error);
    res.status(500).json({ message: 'Failed to fetch tickets' });
  }
});

// ─── ADMIN: REPLY TO TICKET ─────────────────────────
router.post('/admin/reply', authenticate, authorize(['admin']), async (req: Request, res: Response) => {
  try {
    const { ticketId, message } = req.body;
    const db = getDB();

    if (!ticketId || !message) {
      return res.status(400).json({ message: 'Ticket ID and message are required' });
    }

    await db.run('INSERT INTO support_replies (ticketId, fromUser, message) VALUES (?, ?, ?)', [ticketId, 'Admin', message]);
    await db.run('UPDATE support_tickets SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', ['in-progress', ticketId]);

    res.json({ message: 'Reply sent successfully' });
  } catch (error) {
    console.error('Reply error:', error);
    res.status(500).json({ message: 'Failed to send reply' });
  }
});

// ─── ADMIN: RESOLVE TICKET ─────────────────────────
router.post('/admin/resolve', authenticate, authorize(['admin']), async (req: Request, res: Response) => {
  try {
    const { ticketId, message } = req.body;
    const db = getDB();

    if (!ticketId) return res.status(400).json({ message: 'Ticket ID is required' });

    if (message) {
      await db.run('INSERT INTO support_replies (ticketId, fromUser, message) VALUES (?, ?, ?)', [ticketId, 'Admin', message]);
    }

    await db.run('UPDATE support_tickets SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', ['resolved', ticketId]);

    res.json({ message: 'Ticket resolved successfully' });
  } catch (error) {
    console.error('Resolve ticket error:', error);
    res.status(500).json({ message: 'Failed to resolve ticket' });
  }
});

export default router;
