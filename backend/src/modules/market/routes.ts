/**
 * 插件市场路由
 * 提供远程插件索引获取、插件安装、更新等功能
 */

import { Express, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { addSystemLog, nowIso } from '../../core/store.js';
import { getPluginsDir, loadPluginFromFile, reloadPlugin } from '../../core/plugin-manager.js';

const execAsync = promisify(exec);

// 插件市场索引 URL 配置
const MARKET_SOURCES = [
  {
    name: 'gitee',
    url: 'https://gitee.com/feixingwa/qqbot-plugin-market/raw/master/index.json',
    priority: 1,
  },
  // 可以添加更多源
  // {
  //   name: 'github',
  //   url: 'https://raw.githubusercontent.com/xxx/qqbot-plugin-market/main/index.json',
  //   priority: 2,
  // },
];

// 本地示例索引（作为后备源）
const LOCAL_SAMPLE_INDEX: MarketIndex = {
  version: '1.0.0',
  updatedAt: new Date().toISOString(),
  plugins: [
    {
      id: 'wawa-plugin',
      name: '哇哇插件',
      version: '1.0.0',
      author: 'wawa',
      description: '多功能插件，包含签到、投票、文本审核、随机图片等功能',
      repository: 'https://gitee.com/feixingwa/wawa-plugin',
      downloadUrl: 'https://gitee.com/feixingwa/wawa-plugin/repository/archive/master.zip',
      category: '综合',
      tags: ['签到', '审核', '图片', '投票'],
      yunzaiCompatible: true,
      homepage: 'https://gitee.com/feixingwa/wawa-plugin',
      updatedAt: '2024-01-15T00:00:00Z',
      stars: 128,
      downloads: 1500,
    },
    {
      id: 'ai-chat',
      name: 'AI 对话',
      version: '1.2.0',
      author: 'developer',
      description: '集成主流 AI API，支持智能对话、上下文记忆',
      repository: 'https://gitee.com/feixingwa/wawa-plugin-ai-chat',
      downloadUrl: 'https://gitee.com/feixingwa/wawa-plugin-ai-chat/repository/archive/master.zip',
      category: 'AI',
      tags: ['AI', 'ChatGPT', '对话'],
      yunzaiCompatible: true,
      updatedAt: '2024-01-20T00:00:00Z',
      stars: 256,
      downloads: 2300,
    },
    {
      id: 'music-player',
      name: '音乐播放',
      version: '2.0.0',
      author: 'music-fan',
      description: '点歌、播放音乐，支持 QQ音乐、网易云音乐',
      repository: 'https://gitee.com/feixingwa/wawa-plugin-music-player',
      downloadUrl: 'https://gitee.com/feixingwa/wawa-plugin-music-player/repository/archive/master.zip',
      category: '娱乐',
      tags: ['音乐', '点歌', '娱乐'],
      yunzaiCompatible: true,
      updatedAt: '2024-01-18T00:00:00Z',
      stars: 180,
      downloads: 1800,
    },
    {
      id: 'group-manage',
      name: '群管理助手',
      version: '1.5.0',
      author: 'admin-tool',
      description: '群成员管理、违规检测、自动踢人、入群欢迎',
      repository: 'https://gitee.com/feixingwa/wawa-plugin-group-manage',
      downloadUrl: 'https://gitee.com/feixingwa/wawa-plugin-group-manage/repository/archive/master.zip',
      category: '管理',
      tags: ['群管理', '欢迎', '踢人'],
      yunzaiCompatible: true,
      updatedAt: '2024-01-10T00:00:00Z',
      stars: 320,
      downloads: 3500,
    },
    {
      id: 'weather-query',
      name: '天气查询',
      version: '1.0.2',
      author: 'weather-dev',
      description: '查询城市天气，支持未来三天预报',
      repository: 'https://gitee.com/feixingwa/wawa-plugin-weather-query',
      downloadUrl: 'https://gitee.com/feixingwa/wawa-plugin-weather-query/repository/archive/master.zip',
      category: '工具',
      tags: ['天气', '预报', '查询'],
      yunzaiCompatible: false,
      updatedAt: '2024-01-05T00:00:00Z',
      stars: 95,
      downloads: 800,
    },
    {
      id: 'image-search',
      name: '搜图',
      version: '1.1.0',
      author: 'image-lover',
      description: '以图搜图，支持动漫图片识别',
      repository: 'https://gitee.com/feixingwa/wawa-plugin-image-search',
      downloadUrl: 'https://gitee.com/feixingwa/wawa-plugin-image-search/repository/archive/master.zip',
      category: '工具',
      tags: ['搜图', '动漫', '识别'],
      yunzaiCompatible: true,
      updatedAt: '2024-01-12T00:00:00Z',
      stars: 210,
      downloads: 1900,
    },
  ],
};

// 插件索引缓存
interface MarketPlugin {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  repository: string;
  downloadUrl: string;
  category: string;
  tags: string[];
  yunzaiCompatible: boolean;
  homepage?: string;
  updatedAt: string;
  stars?: number;
  downloads?: number;
}

interface MarketIndex {
  version: string;
  updatedAt: string;
  plugins: MarketPlugin[];
}

// 内存缓存
let cachedIndex: MarketIndex | null = null;
let cacheTime: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

// 安装状态跟踪
interface InstallProgress {
  pluginId: string;
  status: 'downloading' | 'extracting' | 'installing' | 'loading' | 'completed' | 'failed';
  progress: number;
  message: string;
  error?: string;
}

const installProgressMap = new Map<string, InstallProgress>();

/**
 * HTTP GET 请求封装
 */
function httpGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const timeout = 30000;
    
    const req = client.get(url, {
      timeout,
      headers: {
        'User-Agent': 'QQBot-PluginMarket/1.0',
        'Accept': 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else if (res.statusCode === 302 || res.statusCode === 301) {
          // 处理重定向
          const location = res.headers.location;
          if (location) {
            httpGet(location).then(resolve).catch(reject);
          } else {
            reject(new Error(`重定向但没有 location 头`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时'));
    });
  });
}

/**
 * 下载文件
 */
function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    const timeout = 120000; // 2分钟超时
    
    const req = client.get(url, {
      timeout,
      headers: {
        'User-Agent': 'QQBot-PluginMarket/1.0',
      },
    }, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        file.close();
        fs.unlinkSync(destPath);
        const location = res.headers.location;
        if (location) {
          downloadFile(location, destPath).then(resolve).catch(reject);
        } else {
          reject(new Error('重定向但没有 location 头'));
        }
        return;
      }
      
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        reject(new Error(`下载失败: HTTP ${res.statusCode}`));
        return;
      }
      
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    });
    
    req.on('error', (err) => {
      file.close();
      fs.unlinkSync(destPath);
      reject(err);
    });
    
    req.on('timeout', () => {
      req.destroy();
      file.close();
      fs.unlinkSync(destPath);
      reject(new Error('下载超时'));
    });
  });
}

/**
 * 解压 ZIP 文件 (使用 unzip 命令)
 */
async function extractZip(zipPath: string, destDir: string): Promise<void> {
  // 确保目标目录存在
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  try {
    // 尝试使用 unzip 命令
    await execAsync(`unzip -o "${zipPath}" -d "${destDir}"`);
  } catch {
    // 如果 unzip 不可用，尝试使用 Python
    try {
      await execAsync(`python3 -c "import zipfile; zipfile.ZipFile('${zipPath}').extractall('${destDir}')"`);
    } catch {
      throw new Error('解压失败: 需要 unzip 或 Python 环境');
    }
  }
}

/**
 * 获取远程插件索引
 */
async function fetchMarketIndex(): Promise<MarketIndex> {
  // 检查缓存
  if (cachedIndex && Date.now() - cacheTime < CACHE_TTL) {
    return cachedIndex;
  }
  
  let lastError: Error | null = null;
  
  // 按优先级尝试不同的源
  const sortedSources = [...MARKET_SOURCES].sort((a, b) => a.priority - b.priority);
  
  for (const source of sortedSources) {
    try {
      addSystemLog('INFO', 'market', `正在从 ${source.name} 获取插件索引...`);
      const data = await httpGet(source.url);
      const index = JSON.parse(data) as MarketIndex;
      
      // 验证索引格式
      if (!index.plugins || !Array.isArray(index.plugins)) {
        throw new Error('无效的索引格式');
      }
      
      // 缓存结果
      cachedIndex = index;
      cacheTime = Date.now();
      
      addSystemLog('INFO', 'market', `成功获取插件索引，共 ${index.plugins.length} 个插件`);
      return index;
    } catch (err) {
      lastError = err as Error;
      addSystemLog('WARN', 'market', `从 ${source.name} 获取索引失败: ${(err as Error).message}`);
    }
  }
  
  // 如果所有源都失败，返回缓存的索引（如果有）
  if (cachedIndex) {
    addSystemLog('WARN', 'market', '所有源都失败，使用缓存的索引');
    return cachedIndex;
  }
  
  // 如果没有缓存，使用本地示例索引作为后备
  addSystemLog('WARN', 'market', '所有源都失败，使用本地示例索引');
  cachedIndex = LOCAL_SAMPLE_INDEX;
  cacheTime = Date.now();
  return LOCAL_SAMPLE_INDEX;
}

/**
 * 注册插件市场路由
 */
export function registerMarketRoutes(app: Express) {
  /**
 * 获取插件市场列表（公开接口，不需要认证）
 * GET /api/plugins/market/list
 */
app.get('/api/plugins/market/list', async (_req: Request, res: Response) => {
    try {
      const index = await fetchMarketIndex();
      
      // 获取已安装的插件 ID 列表
      const PLUGINS_DIR = getPluginsDir();
      const installedPlugins = new Set<string>();
      
      // 扫描插件目录
      if (fs.existsSync(PLUGINS_DIR)) {
        const entries = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            // 云崽插件包目录
            const pkgJsonPath = path.join(PLUGINS_DIR, entry.name, 'package.json');
            if (fs.existsSync(pkgJsonPath)) {
              try {
                const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
                installedPlugins.add(pkgJson.name || entry.name);
              } catch { /* ignore */ }
            }
          } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
            // 单文件插件
            const pluginId = entry.name.replace(/\.(ts|js)$/, '');
            installedPlugins.add(pluginId);
          }
        }
      }
      
      // 标记已安装状态
      const plugins = index.plugins.map(p => ({
        ...p,
        installed: installedPlugins.has(p.id) || installedPlugins.has(p.id.replace(/-/g, '')),
      }));
      
      res.json({
        success: true,
        data: {
          version: index.version,
          updatedAt: index.updatedAt,
          plugins,
        },
      });
    } catch (err) {
      addSystemLog('ERROR', 'market', `获取插件市场列表失败: ${(err as Error).message}`);
      res.status(500).json({
        success: false,
        error: (err as Error).message,
      });
    }
  });

  /**
   * 获取单个插件详情
   * GET /api/plugins/market/:id
   */
  app.get('/api/plugins/market/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const index = await fetchMarketIndex();
      
      const plugin = index.plugins.find(p => p.id === id);
      if (!plugin) {
        res.status(404).json({ success: false, error: '插件不存在' });
        return;
      }
      
      res.json({ success: true, data: plugin });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  });

  /**
   * 获取安装进度
   * GET /api/plugins/market/install/progress/:id
   */
  app.get('/api/plugins/market/install/progress/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const progress = installProgressMap.get(id);
    
    if (!progress) {
      res.json({ success: true, data: null });
      return;
    }
    
    res.json({ success: true, data: progress });
  });

  /**
   * 安装插件
   * POST /api/plugins/market/install
   */
  app.post('/api/plugins/market/install', async (req: Request, res: Response) => {
    try {
      const { pluginId, downloadUrl } = req.body as { pluginId?: string; downloadUrl?: string };
      
      if (!pluginId || !downloadUrl) {
        res.status(400).json({ success: false, error: 'pluginId 和 downloadUrl 为必填项' });
        return;
      }
      
      // 检查是否正在安装
      if (installProgressMap.has(pluginId)) {
        const existing = installProgressMap.get(pluginId)!;
        if (existing.status !== 'completed' && existing.status !== 'failed') {
          res.status(409).json({ success: false, error: '插件正在安装中', progress: existing });
          return;
        }
      }
      
      // 初始化进度
      const progress: InstallProgress = {
        pluginId,
        status: 'downloading',
        progress: 0,
        message: '开始下载插件...',
      };
      installProgressMap.set(pluginId, progress);
      
      // 异步执行安装流程
      installPluginAsync(pluginId, downloadUrl).catch(err => {
        const p = installProgressMap.get(pluginId);
        if (p) {
          p.status = 'failed';
          p.error = err.message;
          p.message = `安装失败: ${err.message}`;
          addSystemLog('ERROR', 'market', `插件 ${pluginId} 安装失败: ${err.message}`);
        }
      });
      
      res.json({ success: true, message: '安装任务已启动', pluginId });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  });

  /**
   * 检查插件更新
   * GET /api/plugins/market/check-updates
   */
  app.get('/api/plugins/market/check-updates', async (_req: Request, res: Response) => {
    try {
      const index = await fetchMarketIndex();
      const PLUGINS_DIR = getPluginsDir();
      const updates: Array<{ id: string; currentVersion: string; latestVersion: string; name: string }> = [];
      
      // 检查每个已安装的插件
      if (fs.existsSync(PLUGINS_DIR)) {
        const entries = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const pkgJsonPath = path.join(PLUGINS_DIR, entry.name, 'package.json');
            if (fs.existsSync(pkgJsonPath)) {
              try {
                const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
                const pluginId = pkgJson.name || entry.name;
                const currentVersion = pkgJson.version || '0.0.0';
                
                // 在市场索引中查找
                const marketPlugin = index.plugins.find(p => p.id === pluginId || p.id === entry.name);
                if (marketPlugin && marketPlugin.version !== currentVersion) {
                  updates.push({
                    id: pluginId,
                    currentVersion,
                    latestVersion: marketPlugin.version,
                    name: marketPlugin.name,
                  });
                }
              } catch { /* ignore */ }
            }
          }
        }
      }
      
      res.json({ success: true, data: updates });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  });

  /**
   * 刷新市场缓存
   * POST /api/plugins/market/refresh
   */
  app.post('/api/plugins/market/refresh', async (_req: Request, res: Response) => {
    try {
      cachedIndex = null;
      cacheTime = 0;
      const index = await fetchMarketIndex();
      
      res.json({
        success: true,
        message: '缓存已刷新',
        data: {
          version: index.version,
          updatedAt: index.updatedAt,
          count: index.plugins.length,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  });
}

/**
 * 异步安装插件
 */
async function installPluginAsync(pluginId: string, downloadUrl: string): Promise<void> {
  const PLUGINS_DIR = getPluginsDir();
  const tempDir = path.join(PLUGINS_DIR, '.temp');
  const zipPath = path.join(tempDir, `${pluginId}.zip`);
  const extractDir = path.join(tempDir, pluginId);
  
  try {
    // 确保临时目录存在
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // 更新进度：下载中
    updateProgress(pluginId, 'downloading', 10, '正在下载插件包...');
    await downloadFile(downloadUrl, zipPath);
    
    // 更新进度：解压中
    updateProgress(pluginId, 'extracting', 40, '正在解压插件包...');
    
    // 清理旧的解压目录
    if (fs.existsSync(extractDir)) {
      fs.rmSync(extractDir, { recursive: true });
    }
    fs.mkdirSync(extractDir, { recursive: true });
    
    await extractZip(zipPath, extractDir);
    
    // 更新进度：安装依赖
    updateProgress(pluginId, 'installing', 60, '正在安装依赖...');
    
    // 查找插件目录（解压后可能有一层子目录）
    let pluginDir = extractDir;
    const extractedItems = fs.readdirSync(extractDir);
    if (extractedItems.length === 1) {
      const itemPath = path.join(extractDir, extractedItems[0]);
      if (fs.statSync(itemPath).isDirectory()) {
        pluginDir = itemPath;
      }
    }
    
    // 检查是否有 package.json
    const pkgJsonPath = path.join(pluginDir, 'package.json');
    if (fs.existsSync(pkgJsonPath)) {
      // 安装 npm 依赖
      try {
        await execAsync('npm install --production', { cwd: pluginDir });
        addSystemLog('INFO', 'market', `插件 ${pluginId} 依赖安装完成`);
      } catch (err) {
        addSystemLog('WARN', 'market', `插件 ${pluginId} 依赖安装警告: ${(err as Error).message}`);
      }
    }
    
    // 更新进度：加载插件
    updateProgress(pluginId, 'loading', 80, '正在加载插件...');
    
    // 移动到插件目录
    const targetDir = path.join(PLUGINS_DIR, pluginId);
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true });
    }
    
    // 复制插件文件
    fs.cpSync(pluginDir, targetDir, { recursive: true });
    
    // 尝试加载插件
    try {
      // 检查是否是云崽插件包
      if (fs.existsSync(path.join(targetDir, 'package.json'))) {
        // 云崽插件包，通过 package.json 的 main 字段加载
        const pkgJson = JSON.parse(fs.readFileSync(path.join(targetDir, 'package.json'), 'utf-8'));
        const mainFile = pkgJson.main || 'index.js';
        const mainPath = path.join(targetDir, mainFile);
        
        if (fs.existsSync(mainPath)) {
          await loadPluginFromFile(mainPath);
        }
      } else {
        // 单文件插件
        const jsFile = path.join(targetDir, 'index.js');
        const tsFile = path.join(targetDir, 'index.ts');
        
        if (fs.existsSync(jsFile)) {
          await loadPluginFromFile(jsFile);
        } else if (fs.existsSync(tsFile)) {
          await loadPluginFromFile(tsFile);
        }
      }
      
      addSystemLog('INFO', 'market', `插件 ${pluginId} 加载成功`);
    } catch (err) {
      addSystemLog('WARN', 'market', `插件 ${pluginId} 加载警告: ${(err as Error).message}`);
    }
    
    // 清理临时文件
    fs.rmSync(zipPath, { force: true });
    fs.rmSync(extractDir, { recursive: true, force: true });
    
    // 更新进度：完成
    updateProgress(pluginId, 'completed', 100, '安装完成');
    addSystemLog('INFO', 'market', `插件 ${pluginId} 安装完成`);
    
  } catch (err) {
    // 清理临时文件
    try {
      if (fs.existsSync(zipPath)) fs.rmSync(zipPath, { force: true });
      if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });
    } catch { /* ignore */ }
    
    updateProgress(pluginId, 'failed', 0, `安装失败: ${(err as Error).message}`);
    throw err;
  }
}

/**
 * 更新安装进度
 */
function updateProgress(
  pluginId: string,
  status: InstallProgress['status'],
  progress: number,
  message: string
): void {
  installProgressMap.set(pluginId, {
    pluginId,
    status,
    progress,
    message,
  });
}
