import { Express } from 'express';
import { buildStatisticsSnapshot } from '../../core/store.js';

export function registerStatisticsRoutes(app: Express) {
  app.get('/api/statistics', (_req, res) => {
    res.json({
      snapshot: buildStatisticsSnapshot()
    });
  });
}
