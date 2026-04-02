import { Express } from 'express';
import { systemLogs } from '../../core/store.js';

export function registerLogRoutes(app: Express) {
  app.get('/logs', (req, res) => {
    const type = String(req.query.type || 'all');
    const limit = Math.max(1, Math.min(Number(req.query.limit || 200), 1000));

    const items =
      type === 'all'
        ? systemLogs.slice(0, limit)
        : systemLogs.filter((log) => log.category === type).slice(0, limit);

    res.json({ items });
  });
}
