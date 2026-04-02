import { Express } from 'express';
import { quickReplies, saveQuickRepliesToDisk, id, nowIso } from '../../core/store.js';
import type { QuickReply } from '../../types.js';

export function registerQuickReplyRoutes(app: Express) {
  // 获取所有快捷回复
  app.get('/quick-replies', (_req, res) => {
    res.json({ items: quickReplies });
  });

  // 创建快捷回复
  app.post('/quick-replies', async (req, res) => {
    const { text, category, shortcut } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ error: 'text is required' });
      return;
    }

    const reply: QuickReply = {
      id: id('qr'),
      text: text.trim(),
      category: category?.trim() || '默认',
      shortcut: shortcut?.trim() || undefined,
      createdAt: nowIso(),
    };

    quickReplies.push(reply);
    await saveQuickRepliesToDisk();

    res.status(201).json(reply);
  });

  // 更新快捷回复
  app.put('/quick-replies/:id', async (req, res) => {
    const { id: replyId } = req.params;
    const { text, category, shortcut } = req.body;

    const idx = quickReplies.findIndex((r) => r.id === replyId);
    if (idx === -1) {
      res.status(404).json({ error: 'Quick reply not found' });
      return;
    }

    if (text !== undefined) {
      if (typeof text !== 'string' || !text.trim()) {
        res.status(400).json({ error: 'text must be non-empty string' });
        return;
      }
      quickReplies[idx].text = text.trim();
    }
    if (category !== undefined) {
      quickReplies[idx].category = category?.trim() || '默认';
    }
    if (shortcut !== undefined) {
      quickReplies[idx].shortcut = shortcut?.trim() || undefined;
    }

    await saveQuickRepliesToDisk();
    res.json(quickReplies[idx]);
  });

  // 删除快捷回复
  app.delete('/quick-replies/:id', async (req, res) => {
    const { id: replyId } = req.params;
    const idx = quickReplies.findIndex((r) => r.id === replyId);
    if (idx === -1) {
      res.status(404).json({ error: 'Quick reply not found' });
      return;
    }

    quickReplies.splice(idx, 1);
    await saveQuickRepliesToDisk();
    res.status(204).send();
  });
}
