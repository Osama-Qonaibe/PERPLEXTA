import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { chatLimiter } from '../middleware/rateLimit.js';
import { 
  generateChatTitle, 
  createChat, 
  getUserChats, 
  getChatMessages, 
  addChatMessage, 
  getMessageCount,
  deleteUserChat,
  togglePinMessage,
  updateUserChatTitle
} from '../services/chat.js';

const router = express.Router();

router.post("/", authenticateToken, chatLimiter, async (req: any, res) => {
  try {
    const chat = await createChat(req.user.id, req.body.title);
    res.json(chat);
  } catch (error: any) {
    const status = error.message === 'Database initializing' ? 503 : 500;
    res.status(status).json({ error: error.message || 'Failed to create chat' });
  }
});

router.get("/", authenticateToken, async (req: any, res) => {
  try {
    const chats = await getUserChats(req.user.id);
    res.json(chats);
  } catch (error: any) {
    const status = error.message === 'Database initializing' ? 503 : 500;
    res.status(status).json({ error: error.message || 'Failed to fetch chats' });
  }
});

router.post("/:id/messages", authenticateToken, chatLimiter, async (req: any, res) => {
  try {
    const { role, content, tool } = req.body;
    const chatId = req.params.id;
    await addChatMessage(chatId, role, content, tool);
    res.json({ success: true });

    const count = await getMessageCount(chatId);
    if (count === 1 && role === 'user') {
      generateChatTitle(chatId, content);
    }
  } catch (error: any) {
    const status = error.message === 'Database initializing' ? 503 : 500;
    res.status(status).json({ error: error.message || 'Failed to add message' });
  }
});

router.get("/:id/messages", authenticateToken, async (req: any, res) => {
  try {
    const messages = await getChatMessages(req.params.id, req.user.id);
    if (!messages) return res.status(404).json({ error: 'Chat not found' });
    res.json(messages);
  } catch (error: any) {
    const status = error.message === 'Database initializing' ? 503 : 500;
    res.status(status).json({ error: error.message || 'Failed to fetch messages' });
  }
});

router.post("/:id/messages/:messageId/pin", authenticateToken, async (req: any, res) => {
  try {
    const { id, messageId } = req.params;
    const result = await togglePinMessage(id, messageId, req.user.id);
    if (!result.success) {
      return res.status(403).json({ error: result.error });
    }
    res.json(result);
  } catch (error: any) {
    const status = error.message === 'Database initializing' ? 503 : 500;
    res.status(status).json({ error: error.message || 'Failed to toggle pin state' });
  }
});

router.delete("/:id", authenticateToken, async (req: any, res) => {
  try {
    const success = await deleteUserChat(req.params.id, req.user.id);
    if (!success) return res.status(404).json({ error: 'Chat not found' });
    res.json({ success: true });
  } catch (error: any) {
    const status = error.message === 'Database initializing' ? 503 : 500;
    res.status(status).json({ error: error.message || 'Failed to delete chat' });
  }
});

router.patch("/:id", authenticateToken, async (req: any, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const success = await updateUserChatTitle(req.params.id, req.user.id, title.trim());
    if (!success) return res.status(404).json({ error: 'Chat not found' });
    res.json({ success: true, title: title.trim() });
  } catch (error: any) {
    const status = error.message === 'Database initializing' ? 503 : 500;
    res.status(status).json({ error: error.message || 'Failed to update chat title' });
  }
});

export default router;
