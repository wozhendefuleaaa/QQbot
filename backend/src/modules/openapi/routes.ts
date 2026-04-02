import crypto from 'crypto';
import { Express } from 'express';
import { appConfig, id, nowIso, openApiTokens, saveOpenApiTokensToDisk } from '../../core/store.js';

function maskToken(token: string) {
  if (token.length < 10) return '***';
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

export function registerOpenApiRoutes(app: Express) {
  app.get('/openapi/tokens', (_req, res) => {
    res.json({
      enabled: appConfig.allowOpenApi,
      items: openApiTokens.map((x) => ({
        id: x.id,
        name: x.name,
        tokenMasked: maskToken(x.token),
        enabled: x.enabled,
        createdAt: x.createdAt
      }))
    });
  });

  app.post('/openapi/tokens', async (req, res) => {
    if (!appConfig.allowOpenApi) {
      res.status(403).json({ error: 'OpenAPI 已禁用' });
      return;
    }

    const { name } = req.body as { name?: string };
    if (!name) {
      res.status(400).json({ error: 'name 为必填项' });
      return;
    }

    const raw = crypto.randomBytes(24).toString('hex');
    const token = `qqbot_${raw}`;
    const item = {
      id: id('oak'),
      name,
      token,
      enabled: true,
      createdAt: nowIso()
    };

    openApiTokens.unshift(item);
    await saveOpenApiTokensToDisk();
    res.status(201).json(item);
  });

  app.post('/openapi/tokens/:id/toggle', async (req, res) => {
    const item = openApiTokens.find((x) => x.id === req.params.id);
    if (!item) {
      res.status(404).json({ error: 'token 不存在' });
      return;
    }

    item.enabled = !item.enabled;
    await saveOpenApiTokensToDisk();
    res.json({
      id: item.id,
      name: item.name,
      tokenMasked: maskToken(item.token),
      enabled: item.enabled,
      createdAt: item.createdAt
    });
  });

  app.delete('/openapi/tokens/:id', async (req, res) => {
    const index = openApiTokens.findIndex((x) => x.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'token 不存在' });
      return;
    }

    const [deleted] = openApiTokens.splice(index, 1);
    await saveOpenApiTokensToDisk();
    res.json({ ok: true, deleted: { id: deleted.id, name: deleted.name } });
  });
}
