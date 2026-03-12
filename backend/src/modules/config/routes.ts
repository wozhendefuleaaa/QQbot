import { Express } from 'express';
import { appConfig, saveAppConfigToDisk } from '../../core/store.js';

export function registerConfigRoutes(app: Express) {
  app.get('/api/config', (_req, res) => {
    res.json(appConfig);
  });

  app.post('/api/config', async (req, res) => {
    const { webName, notice, allowOpenApi, defaultIntent } = req.body as {
      webName?: string;
      notice?: string;
      allowOpenApi?: boolean;
      defaultIntent?: number;
    };

    if (typeof webName === 'string') appConfig.webName = webName;
    if (typeof notice === 'string') appConfig.notice = notice;
    if (typeof allowOpenApi === 'boolean') appConfig.allowOpenApi = allowOpenApi;
    if (typeof defaultIntent === 'number' && Number.isFinite(defaultIntent) && defaultIntent >= 0) {
      appConfig.defaultIntent = defaultIntent;
    }

    await saveAppConfigToDisk();
    res.json({ ok: true, config: appConfig });
  });
}
