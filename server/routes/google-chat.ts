import express from 'express';
import { body, header } from 'express-validator';

const router = express.Router();

const validateToken = [
  header('authorization').exists().withMessage('Authorization header is required'),
];

router.get('/spaces', validateToken, async (req: express.Request, res: express.Response) => {
  try {
    const token = req.headers.authorization;
    const response = await fetch('https://chat.googleapis.com/v1/spaces', {
      headers: { Authorization: token as string },
    });
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error('[Google Chat API] Error listing spaces:', error);
    res.status(500).json({ error: 'Failed to list Google Chat spaces' });
  }
});

router.get('/spaces/:spaceId/messages', validateToken, async (req: express.Request, res: express.Response) => {
  try {
    const token = req.headers.authorization;
    const { spaceId } = req.params;
    const response = await fetch(`https://chat.googleapis.com/v1/spaces/${spaceId}/messages`, {
      headers: { Authorization: token as string },
    });
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error('[Google Chat API] Error listing messages:', error);
    res.status(500).json({ error: 'Failed to list Google Chat messages' });
  }
});

router.post('/spaces/:spaceId/messages', [
  ...validateToken,
  body('text').notEmpty().withMessage('Message text is required'),
], async (req: express.Request, res: express.Response) => {
  try {
    const token = req.headers.authorization;
    const { spaceId } = req.params;
    const { text } = req.body;

    const response = await fetch(`https://chat.googleapis.com/v1/spaces/${spaceId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: token as string,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error('[Google Chat API] Error creating message:', error);
    res.status(500).json({ error: 'Failed to send Google Chat message' });
  }
});

router.get('/unread-count', validateToken, async (req: express.Request, res: express.Response) => {
  try {
    const token = req.headers.authorization;
    
    const spacesRes = await fetch('https://chat.googleapis.com/v1/spaces', {
      headers: { Authorization: token as string },
    });
    const spacesData = await spacesRes.json();
    const spaces = spacesData.spaces || [];
    
    let totalUnread = 0;
    
    for (const space of spaces.slice(0, 3)) {
      const msgsRes = await fetch(`https://chat.googleapis.com/v1/${space.name}/messages?pageSize=5`, {
        headers: { Authorization: token as string },
      });
      const msgsData = await msgsRes.json();
      const messages = msgsData.messages || [];
      
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
      const newMessages = messages.filter((m: any) => new Date(m.createTime) > fifteenMinsAgo);
      totalUnread += newMessages.length;
    }

    res.json({ count: totalUnread });
  } catch (error: any) {
    console.error('[Google Chat API] Error fetching unread count:', error);
    res.json({ count: 0 }); // Silent fail to avoid UI noise
  }
});

export default router;
