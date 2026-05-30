import { loadAllPlugins, getLoadedPlugins } from './src/core/plugin-manager.js';
import { plugins } from './src/core/store.js';

(async () => {
  await loadAllPlugins();

  const loaded = getLoadedPlugins();
  const loadedIds = new Set(loaded.map((p) => p.id));

  console.log(`plugins.json 条目: ${plugins.length}`);
  console.log(`已加载插件: ${loaded.length}`);

  let allAvailable = true;
  for (const item of plugins) {
    const available = loadedIds.has(item.id);
    if (!available) {
      allAvailable = false;
    }
    console.log(`${available ? '✅' : '❌'} ${item.id} (${item.name})`);
  }

  console.log(allAvailable ? '结论：注册表中的全部插件都已加载，可用。' : '结论：存在未加载插件，请检查后端日志。');
})();
