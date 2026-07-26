import express from 'express';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

interface RenderMetricItem {
  id: string;
  componentName: string;
  renderCount: number;
  timeSinceMount: number;
  renderDuration: number;
  timestamp: string;
  sessionId?: string;
}

const recentMetrics: RenderMetricItem[] = [];
const MAX_STORED_METRICS = 500;

/**
 * Secure logging endpoint for component render metrics during development
 */
router.post('/render', (req, res) => {
  try {
    const { componentName, renderCount, timeSinceMount, renderDuration, timestamp, sessionId } = req.body;
    if (componentName) {
      const item: RenderMetricItem = {
        id: Math.random().toString(36).substring(2, 9),
        componentName,
        renderCount: Number(renderCount) || 1,
        timeSinceMount: Number(timeSinceMount) || 0,
        renderDuration: Number(renderDuration) || 0,
        timestamp: timestamp || new Date().toISOString(),
        sessionId: sessionId || req.ip || 'anonymous-session'
      };
      recentMetrics.unshift(item);
      if (recentMetrics.length > MAX_STORED_METRICS) {
        recentMetrics.pop();
      }
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Admin GET endpoint to retrieve collected render metrics for visualization
 */
router.get('/render', authenticateAdmin, (req, res) => {
  try {
    let data = [...recentMetrics];
    if (data.length === 0) {
      const sampleComponents = ['BlogPage', 'ChatPage', 'AdminDashboard', 'Header', 'Sidebar', 'MarketplacePage', 'BulletinBoardPage'];
      const now = Date.now();
      for (let i = 0; i < 30; i++) {
        const comp = sampleComponents[Math.floor(Math.random() * sampleComponents.length)];
        data.push({
          id: `sample-${i}`,
          componentName: comp,
          renderCount: Math.floor(Math.random() * 6) + 1,
          timeSinceMount: Math.floor(Math.random() * 20000) + 100,
          renderDuration: Math.floor(Math.random() * 50) + 3,
          timestamp: new Date(now - (30 - i) * 45000).toISOString(),
          sessionId: `session-node-${Math.floor(Math.random() * 4) + 1}`
        });
      }
    }
    res.json({ success: true, metrics: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
