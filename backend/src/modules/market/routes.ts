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
// Gitee API Token - 用于下载私有仓库或需要认证的仓库归档
const GITEE_ACCESS_TOKEN = '7d5b0ad1b7cca069b4d1ae5ea66ab584';

/**
 * 将 Gitee 仓库 URL 转换为 API zipball URL
 * 支持格式：
 * - https://gitee.com/owner/repo/repository/archive/master.zip
 * - https://gitee.com/owner/repo
 */
function convertToGiteeApiUrl(url: string): string {
  // 匹配 Gitee 仓库 archive URL
  const archiveMatch = url.match(/https:\/\/gitee\.com\/([^/]+)\/([^/]+)\/repository\/archive\/([^/]+)\.zip/);
  if (archiveMatch) {
    const [, owner, repo, ref] = archiveMatch;
    return `https://gitee.com/api/v5/repos/${owner}/${repo}/zipball/${ref}?access_token=${GITEE_ACCESS_TOKEN}`;
  }
  
  // 如果已经是 API URL，添加 token
  if (url.includes('gitee.com/api/v5/repos/') && !url.includes('access_token')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}access_token=${GITEE_ACCESS_TOKEN}`;
  }
  
  return url;
}

/**
 * 使用 curl 命令下载文件（支持自动跟随重定向）
 * 对于 Gitee 等需要复杂重定向处理的平台更可靠
 */
async function downloadFileWithCurl(url: string, destPath: string): Promise<void> {
  const timeout = 120000; // 2分钟超时
  
  addSystemLog('INFO', 'market', `使用 curl 下载: ${url}`);
  
  try {
    // 使用 curl 下载，-L 跟随重定向，-o 输出到文件
    const { stdout, stderr } = await execAsync(
      `curl -L --max-time ${Math.floor(timeout / 1000)} -o "${destPath}" "${url}"`,
      { timeout: timeout + 10000 }
    );
    
    // 检查下载的文件
    if (!fs.existsSync(destPath)) {
      throw new Error('下载失败: 文件未创建');
    }
    
    const stats = fs.statSync(destPath);
    if (stats.size === 0) {
      fs.unlinkSync(destPath);
      throw new Error('下载失败: 文件为空');
    }
    
    // 检查是否为 HTML 文件（错误页面）
    const buffer = fs.readFileSync(destPath);
    const header = buffer.slice(0, 100).toString('utf8');
    if (header.includes('<!DOCTYPE html') || header.includes('<html')) {
      fs.unlinkSync(destPath);
      throw new Error('下载失败: 服务器返回 HTML 页面而不是 ZIP 文件');
    }
    
    addSystemLog('INFO', 'market', `curl 下载成功: ${stats.size} 字节`);
  } catch (error) {
    if (fs.existsSync(destPath)) {
      fs.unlinkSync(destPath);
    }
    throw error;
  }
}

function downloadFile(url: string, destPath: string, cookies: string = ''): Promise<void> {
  return new Promise((resolve, reject) => {
    // 对于 Gitee URL，使用 curl 下载（更可靠）
    if (url.includes('gitee.com')) {
      downloadFileWithCurl(url, destPath).then(resolve).catch(reject);
      return;
    }
    
    // 非 Gitee URL 使用 Node.js 原生下载
    const client = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    const timeout = 120000; // 2分钟超时

    // 模拟浏览器请求
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/zip,application/octet-stream,*/*',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'identity',
    };

    if (cookies) {
      headers['Cookie'] = cookies;
    }

    const req = client.get(url, { timeout, headers }, (res) => {
      // 处理重定向
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.statusCode !== 304) {
        file.close();
        fs.unlinkSync(destPath);
        const location = res.headers.location;
        if (location) {
          addSystemLog('INFO', 'market', `下载重定向: ${res.statusCode} -> ${location}`);
          downloadFile(location, destPath, cookies).then(resolve).catch(reject);
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

      // 检查内容类型
      const contentType = res.headers['content-type'] || '';
      if (contentType.includes('text/html')) {
        file.close();
        fs.unlinkSync(destPath);
        reject(new Error(`下载失败: 服务器返回 HTML 页面而不是 ZIP 文件`));
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
 * 解压 ZIP 文件 (使用 unzip 命令或 Python)
 */
async function extractZip(zipPath: string, destDir: string): Promise<void> {
  // 确保目标目录存在
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // 检查 ZIP 文件是否存在
  if (!fs.existsSync(zipPath)) {
    throw new Error(`ZIP 文件不存在: ${zipPath}`);
  }

  addSystemLog('INFO', 'market', `开始解压: ${zipPath} -> ${destDir}`);

  // 方法1: 使用 unzip 命令
  try {
    const { stdout, stderr } = await execAsync(`unzip -o "${zipPath}" -d "${destDir}"`, {
      timeout: 60000, // 60秒超时
    });
    addSystemLog('INFO', 'market', `unzip 解压成功: ${stderr || stdout || '无输出'}`);
    return;
  } catch (unzipError) {
    const errMsg = unzipError instanceof Error ? unzipError.message : String(unzipError);
    addSystemLog('WARN', 'market', `unzip 解压失败: ${errMsg}，尝试使用 Python...`);
  }

  // 方法2: 使用 Python zipfile 模块
  try {
    // 使用双引号避免单引号转义问题
    const pythonCmd = `python3 -c "import zipfile; zipfile.ZipFile('${zipPath}').extractall('${destDir}')"`;
    await execAsync(pythonCmd, { timeout: 60000 });
    addSystemLog('INFO', 'market', `Python 解压成功`);
    return;
  } catch (pythonError) {
    const errMsg = pythonError instanceof Error ? pythonError.message : String(pythonError);
    addSystemLog('ERROR', 'market', `Python 解压也失败: ${errMsg}`);
  }

  // 方法3: 使用 Node.js 内置的 zlib + adm-zip 风格的解压（如果系统有 tar）
  try {
    // 某些系统可能有 python 而不是 python3
    await execAsync(`python -c "import zipfile; zipfile.ZipFile('${zipPath}').extractall('${destDir}')"`, {
      timeout: 60000,
    });
    addSystemLog('INFO', 'market', `Python (python) 解压成功`);
    return;
  } catch (python2Error) {
    addSystemLog('WARN', 'market', `Python (python) 也失败`);
  }

  throw new Error('解压失败: 需要 unzip 或 Python 环境（已尝试 unzip, python3, python）');
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
   * 获取市场统计信息 (必须在 /:id 之前定义)
   * GET /api/plugins/market/stats
   */
  app.get('/api/plugins/market/stats', async (_req: Request, res: Response) => {
    try {
      const stats = await getMarketStats();
      res.json({ success: true, data: stats });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  });

  /**
   * 获取安装日志 (必须在 /:id 之前定义)
   * GET /api/plugins/market/logs
   */
  app.get('/api/plugins/market/logs', (_req: Request, res: Response) => {
    try {
      const logs = readInstallLogs();
      res.json({
        success: true,
        data: {
          items: logs,
          total: logs.length,
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  });

  /**
   * 清空安装日志 (必须在 /:id 之前定义)
   * DELETE /api/plugins/market/logs
   */
  app.delete('/api/plugins/market/logs', (_req: Request, res: Response) => {
    try {
      writeInstallLogs([]);
      addSystemLog('INFO', 'market', '安装日志已清空');
      res.json({ success: true, message: '日志已清空' });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
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
      const { pluginId, downloadUrl, pluginName } = req.body as { pluginId?: string; downloadUrl?: string; pluginName?: string };
      
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
      
      // 记录安装开始时间
      recordInstallStart(pluginId);
      
      // 初始化进度
      const progress: InstallProgress = {
        pluginId,
        status: 'downloading',
        progress: 0,
        message: '开始下载插件...',
      };
      installProgressMap.set(pluginId, progress);
      
      // 获取插件名称
      const displayName = pluginName || pluginId;
      
      // 异步执行安装流程
      installPluginAsync(pluginId, downloadUrl).then(() => {
        // 安装成功，记录日志
        addInstallLog(pluginId, displayName, 'success', '安装成功');
      }).catch(err => {
        const p = installProgressMap.get(pluginId);
        if (p) {
          p.status = 'failed';
          p.error = err.message;
          p.message = `安装失败: ${err.message}`;
          addSystemLog('ERROR', 'market', `插件 ${pluginId} 安装失败: ${err.message}`);
        }
        // 安装失败，记录日志
        addInstallLog(pluginId, displayName, 'failed', `安装失败: ${err.message}`, err.message);
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
      // 读取 package.json 获取依赖信息
      let pkgJson: { dependencies?: Record<string, string>; [key: string]: unknown } = {};
      try {
        pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
      } catch {
        // 忽略解析错误
      }
      
      const deps = pkgJson.dependencies || {};
      const depCount = Object.keys(deps).length;
      
      if (depCount > 0) {
        updateProgress(pluginId, 'installing', 60, `正在安装 ${depCount} 个依赖包...`);
        
        // 安装 npm 依赖（带重试机制）
        let installSuccess = false;
        const maxRetries = 3;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            addSystemLog('INFO', 'market', `插件 ${pluginId} 依赖安装尝试 ${attempt}/${maxRetries}...`);
            
            // 使用 npm install 并设置超时
            const { stdout, stderr } = await execAsync('npm install --production --no-audit --no-fund', {
              cwd: pluginDir,
              timeout: 120000 // 2 分钟超时
            });
            
            installSuccess = true;
            addSystemLog('INFO', 'market', `插件 ${pluginId} 依赖安装完成`);
            
            if (stderr && !stderr.includes('npm warn')) {
              addSystemLog('INFO', 'market', `npm stderr: ${stderr}`);
            }
            break;
          } catch (err) {
            const errorMsg = (err as Error).message;
            addSystemLog('WARN', 'market', `插件 ${pluginId} 依赖安装失败 (尝试 ${attempt}/${maxRetries}): ${errorMsg}`);
            
            if (attempt < maxRetries) {
              // 等待后重试
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }
        
        if (!installSuccess) {
          // 尝试逐个安装依赖
          addSystemLog('INFO', 'market', `插件 ${pluginId} 尝试逐个安装依赖...`);
          updateProgress(pluginId, 'installing', 70, '正在逐个安装依赖...');
          
          for (const [depName, depVersion] of Object.entries(deps)) {
            try {
              await execAsync(`npm install "${depName}@${depVersion}" --no-audit --no-fund`, {
                cwd: pluginDir,
                timeout: 60000
              });
              addSystemLog('INFO', 'market', `插件 ${pluginId} 依赖 ${depName} 安装成功`);
            } catch (err) {
              addSystemLog('WARN', 'market', `插件 ${pluginId} 依赖 ${depName} 安装失败: ${(err as Error).message}`);
            }
          }
        }
      } else {
        addSystemLog('INFO', 'market', `插件 ${pluginId} 无外部依赖`);
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

// ==================== 安装日志系统 ====================

interface InstallLog {
  id: string;
  pluginId: string;
  pluginName: string;
  status: 'success' | 'failed';
  message: string;
  duration: number;  // 安装耗时（毫秒）
  timestamp: string;
  error?: string;
}

const INSTALL_LOGS_FILE = path.join(process.cwd(), 'data', 'install-logs.json');
const MAX_LOGS = 100;  // 最多保留100条日志

// 安装开始时间记录
const installStartTimes = new Map<string, number>();

/**
 * 读取安装日志
 */
function readInstallLogs(): InstallLog[] {
  try {
    if (fs.existsSync(INSTALL_LOGS_FILE)) {
      const data = fs.readFileSync(INSTALL_LOGS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    addSystemLog('WARN', 'market', `读取安装日志失败: ${(err as Error).message}`);
  }
  return [];
}

/**
 * 写入安装日志
 */
function writeInstallLogs(logs: InstallLog[]): void {
  try {
    // 确保目录存在
    const dir = path.dirname(INSTALL_LOGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(INSTALL_LOGS_FILE, JSON.stringify(logs, null, 2));
  } catch (err) {
    addSystemLog('WARN', 'market', `写入安装日志失败: ${(err as Error).message}`);
  }
}

/**
 * 添加安装日志
 */
function addInstallLog(
  pluginId: string,
  pluginName: string,
  status: 'success' | 'failed',
  message: string,
  error?: string
): void {
  const logs = readInstallLogs();
  
  // 计算安装耗时
  const startTime = installStartTimes.get(pluginId);
  const duration = startTime ? Date.now() - startTime : 0;
  installStartTimes.delete(pluginId);
  
  const newLog: InstallLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    pluginId,
    pluginName,
    status,
    message,
    duration,
    timestamp: new Date().toISOString(),
    error,
  };
  
  // 添加到开头
  logs.unshift(newLog);
  
  // 限制日志数量
  if (logs.length > MAX_LOGS) {
    logs.splice(MAX_LOGS);
  }
  
  writeInstallLogs(logs);
  addSystemLog('INFO', 'market', `记录安装日志: ${pluginId} - ${status}`);
}

/**
 * 记录安装开始
 */
function recordInstallStart(pluginId: string): void {
  installStartTimes.set(pluginId, Date.now());
}

// ==================== 统计系统 ====================

interface MarketStats {
  totalPlugins: number;
  totalDownloads: number;
  localInstalls: number;
  categories: Record<string, number>;
  recentInstalls: InstallLog[];
  popularPlugins: Array<{
    id: string;
    name: string;
    downloads: number;
  }>;
}

/**
 * 获取市场统计信息
 */
async function getMarketStats(): Promise<MarketStats> {
  // 获取市场索引
  const index = await fetchMarketIndex();
  
  // 获取本地已安装插件
  const registryPath = path.join(process.cwd(), 'data', 'plugins.json');
  let localPlugins: Array<{ id: string; name: string }> = [];
  try {
    if (fs.existsSync(registryPath)) {
      localPlugins = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
    }
  } catch { /* ignore */ }
  
  const localPluginIds = new Set(localPlugins.map(p => p.id));
  
  // 计算分类统计
  const categories: Record<string, number> = {};
  for (const plugin of index.plugins) {
    const cat = plugin.category || '其他';
    categories[cat] = (categories[cat] || 0) + 1;
  }
  
  // 计算总下载量
  const totalDownloads = index.plugins.reduce((sum, p) => sum + (p.downloads || 0), 0);
  
  // 获取最近安装记录
  const logs = readInstallLogs();
  const recentInstalls = logs.slice(0, 10);
  
  // 获取热门插件 Top 5
  const popularPlugins = [...index.plugins]
    .sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
    .slice(0, 5)
    .map(p => ({
      id: p.id,
      name: p.name,
      downloads: p.downloads || 0,
    }));
  
  return {
    totalPlugins: index.plugins.length,
    totalDownloads,
    localInstalls: localPluginIds.size,
    categories,
    recentInstalls,
    popularPlugins,
  };
}
