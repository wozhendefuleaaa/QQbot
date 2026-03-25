/**
 * Python 插件适配器
 * 通过子进程方式运行 Python 插件，使用 JSON-RPC 风格通信
 */

import { spawn, ChildProcess } from 'child_process';
import { Plugin, PluginContext, MessageEvent, CommandDefinition } from './plugin-types.js';
import { addSystemLog } from './store.js';
import * as path from 'path';
import * as fs from 'fs';

// Python 插件通信协议
interface PythonMessage {
  type: 'request' | 'response' | 'event';
  id?: string;
  method?: string;
  params?: any;
  result?: any;
  error?: string;
}

// Python 插件元数据
interface PythonPluginMeta {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  priority?: number;
  commands?: Array<{
    name: string;
    aliases?: string[];
    description: string;
    usage?: string;
    pattern?: string;
    permission?: 'public' | 'admin' | 'owner';
    cooldown?: number;
    hidden?: boolean;
  }>;
}

// Python 插件进程实例
interface PythonPluginProcess {
  process: ChildProcess;
  pluginId: string;
  pluginPath: string;
  pendingRequests: Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }>;
  initialized: boolean;
  meta?: PythonPluginMeta;
}

// 存储所有 Python 插件进程
const pythonProcesses: Map<string, PythonPluginProcess> = new Map();

// 插件上下文缓存（用于回调）
let globalContext: PluginContext | null = null;

/**
 * 检查 Python 是否可用
 */
async function checkPythonAvailable(): Promise<string | null> {
  const pythonCommands = ['python3', 'python'];
  
  for (const cmd of pythonCommands) {
    try {
      const result = await new Promise<boolean>((resolve) => {
        const proc = spawn(cmd, ['--version'], { timeout: 5000 });
        proc.on('error', () => resolve(false));
        proc.on('close', (code) => resolve(code === 0));
      });
      if (result) {
        return cmd;
      }
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * 创建 Python 插件运行时脚本
 */
function getPythonRuntimeScript(): string {
  return `
import sys
import json
import asyncio
import threading
from typing import Dict, List, Any, Optional, Callable

class PluginContext:
    """插件上下文代理类"""
    def __init__(self):
        self._pending_messages = []
    
    def _call_host(self, method: str, params: Dict) -> Any:
        """调用宿主方法（同步阻塞）"""
        request = {
            'type': 'request',
            'id': str(id(params)),
            'method': method,
            'params': params
        }
        # 发送请求到宿主
        sys.stdout.write(json.dumps(request) + '\\n')
        sys.stdout.flush()
        # 注意：这里是简化的实现，实际通信是异步的
        # 宿主会直接处理这些方法调用
        return None
    
    def send_message(self, target_id: str, target_type: str, text: str) -> None:
        """发送消息"""
        # 通过特殊事件通知宿主发送消息
        event = {
            'type': 'event',
            'method': 'send_message',
            'params': {
                'targetId': target_id,
                'targetType': target_type,
                'text': text
            }
        }
        sys.stdout.write(json.dumps(event) + '\\n')
        sys.stdout.flush()
    
    def log(self, level: str, message: str) -> None:
        """记录日志"""
        event = {
            'type': 'event',
            'method': 'log',
            'params': {'level': level, 'message': message}
        }
        sys.stdout.write(json.dumps(event) + '\\n')
        sys.stdout.flush()
    
    def get_connected_account_id(self) -> Optional[str]:
        """获取当前连接的账号ID（需要同步调用）"""
        # 这个方法需要同步返回，暂时返回 None
        # 实际使用时可以通过缓存机制实现
        return None

class PythonPlugin:
    """Python 插件基类"""
    
    # 插件元数据（子类必须覆盖）
    id: str = ''
    name: str = ''
    version: str = '1.0.0'
    description: str = ''
    author: str = ''
    priority: int = 100
    
    def __init__(self):
        self.ctx = PluginContext()
        self._commands: Dict[str, Callable] = {}
        self._command_defs: List[Dict] = []
    
    def on_load(self) -> None:
        """插件加载时调用"""
        pass
    
    def on_unload(self) -> None:
        """插件卸载时调用"""
        pass
    
    def on_message(self, event: Dict) -> Optional[bool]:
        """消息处理器"""
        return None
    
    def command(self, name: str, aliases: List[str] = None, 
                description: str = '', usage: str = '',
                permission: str = 'public', cooldown: int = 0,
                hidden: bool = False):
        """命令装饰器"""
        def decorator(func: Callable):
            self._command_defs.append({
                'name': name,
                'aliases': aliases or [],
                'description': description,
                'usage': usage,
                'permission': permission,
                'cooldown': cooldown,
                'hidden': hidden
            })
            self._commands[name] = func
            if aliases:
                for alias in aliases:
                    self._commands[alias] = func
            return func
        return decorator
    
    def get_meta(self) -> Dict:
        """获取插件元数据"""
        return {
            'id': self.id,
            'name': self.name,
            'version': self.version,
            'description': self.description,
            'author': self.author,
            'priority': self.priority,
            'commands': self._command_defs
        }

# 全局插件实例
_plugin_instance: Optional[PythonPlugin] = None

def get_plugin() -> PythonPlugin:
    """获取插件实例（子模块应覆盖此函数）"""
    global _plugin_instance
    if _plugin_instance is None:
        _plugin_instance = PythonPlugin()
    return _plugin_instance

def set_plugin(plugin: PythonPlugin):
    """设置插件实例"""
    global _plugin_instance
    _plugin_instance = plugin

# 别名，方便导入
Plugin = PythonPlugin

class MessageHandler:
    """处理与宿主的通信"""
    
    def __init__(self):
        self._request_handlers = {}
        self._setup_handlers()
    
    def _setup_handlers(self):
        """设置请求处理器"""
        self._request_handlers = {
            'get_meta': self._handle_get_meta,
            'on_load': self._handle_on_load,
            'on_unload': self._handle_on_unload,
            'on_message': self._handle_on_message,
            'execute_command': self._handle_execute_command,
        }
    
    def _handle_get_meta(self, params: Dict) -> Dict:
        """获取插件元数据"""
        plugin = get_plugin()
        return plugin.get_meta()
    
    def _handle_on_load(self, params: Dict) -> None:
        """处理加载事件"""
        plugin = get_plugin()
        plugin.on_load()
        return None
    
    def _handle_on_unload(self, params: Dict) -> None:
        """处理卸载事件"""
        plugin = get_plugin()
        plugin.on_unload()
        return None
    
    def _handle_on_message(self, params: Dict) -> Optional[bool]:
        """处理消息事件"""
        plugin = get_plugin()
        return plugin.on_message(params)
    
    def _handle_execute_command(self, params: Dict) -> Any:
        """执行命令"""
        plugin = get_plugin()
        cmd_name = params.get('command')
        args = params.get('args', [])
        event = params.get('event', {})
        
        if cmd_name in plugin._commands:
            handler = plugin._commands[cmd_name]
            return handler(args, event, plugin.ctx)
        return None
    
    def run(self):
        """运行消息循环"""
        reader = sys.stdin
        writer = sys.stdout
        
        while True:
            try:
                line = reader.readline()
                if not line:
                    break
                
                message = json.loads(line.strip())
                
                if message.get('type') == 'request':
                    request_id = message.get('id')
                    method = message.get('method')
                    params = message.get('params', {})
                    
                    response = {
                        'type': 'response',
                        'id': request_id
                    }
                    
                    if method in self._request_handlers:
                        try:
                            result = self._request_handlers[method](params)
                            response['result'] = result
                        except Exception as e:
                            response['error'] = str(e)
                    else:
                        response['error'] = f'Unknown method: {method}'
                    
                    writer.write(json.dumps(response) + '\\n')
                    writer.flush()
            
            except json.JSONDecodeError as e:
                sys.stderr.write(f'JSON decode error: {e}\\n')
            except Exception as e:
                sys.stderr.write(f'Error: {e}\\n')

# 启动消息处理
if __name__ == '__main__':
    handler = MessageHandler()
    handler.run()
`;
}

/**
 * 向 Python 插件发送请求并等待响应
 */
function sendPythonRequest(
  pluginId: string,
  method: string,
  params: any,
  timeout: number = 30000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const pluginProcess = pythonProcesses.get(pluginId);
    if (!pluginProcess || !pluginProcess.process.stdin) {
      reject(new Error(`Python 插件进程不存在: ${pluginId}`));
      return;
    }

    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const message: PythonMessage = {
      type: 'request',
      id: requestId,
      method,
      params
    };

    const timeoutHandle = setTimeout(() => {
      pluginProcess.pendingRequests.delete(requestId);
      reject(new Error(`Python 插件请求超时: ${method}`));
    }, timeout);

    pluginProcess.pendingRequests.set(requestId, {
      resolve,
      reject,
      timeout: timeoutHandle
    });

    try {
      pluginProcess.process.stdin.write(JSON.stringify(message) + '\n');
    } catch (error) {
      clearTimeout(timeoutHandle);
      pluginProcess.pendingRequests.delete(requestId);
      reject(error);
    }
  });
}

/**
 * 处理 Python 插件的响应和事件
 */
function handlePythonResponse(pluginId: string, data: string, ctx?: PluginContext): void {
  const pluginProcess = pythonProcesses.get(pluginId);
  if (!pluginProcess) return;

  try {
    const message: PythonMessage = JSON.parse(data);
    
    if (message.type === 'response' && message.id) {
      // 处理请求响应
      const pending = pluginProcess.pendingRequests.get(message.id);
      if (pending) {
        clearTimeout(pending.timeout);
        pluginProcess.pendingRequests.delete(message.id);
        
        if (message.error) {
          pending.reject(new Error(message.error));
        } else {
          pending.resolve(message.result);
        }
      }
    } else if (message.type === 'event' && message.method) {
      // 处理事件（如 send_message, log）
      const context = ctx || globalContext;
      if (!context) {
        addSystemLog('WARN', 'plugin', `Python 插件事件处理失败: 上下文不可用 - ${pluginId}`);
        return;
      }
      
      switch (message.method) {
        case 'send_message':
          const params = message.params || {};
          context.sendMessage(params.targetId, params.targetType, params.text).catch(err => {
            addSystemLog('ERROR', 'plugin', `Python 插件发送消息失败: ${err}`);
          });
          break;
        case 'log':
          const logParams = message.params || {};
          addSystemLog((logParams.level || 'info').toUpperCase() as 'INFO' | 'WARN' | 'ERROR', 'plugin', `[${pluginId}] ${logParams.message || ''}`);
          break;
        default:
          addSystemLog('WARN', 'plugin', `未知的 Python 插件事件: ${message.method}`);
      }
    }
  } catch (error) {
    addSystemLog('ERROR', 'plugin', `Python 插件响应解析错误: ${pluginId} - ${error}`);
  }
}

/**
 * 从 Python 插件文件加载插件
 */
export async function loadPythonPlugin(filePath: string, ctx: PluginContext): Promise<Plugin | null> {
  // 检查 Python 是否可用
  const pythonCmd = await checkPythonAvailable();
  if (!pythonCmd) {
    addSystemLog('WARN', 'plugin', `Python 不可用，无法加载 Python 插件: ${filePath}`);
    return null;
  }

  // 检查文件是否存在
  if (!fs.existsSync(filePath)) {
    addSystemLog('ERROR', 'plugin', `Python 插件文件不存在: ${filePath}`);
    return null;
  }

  const pluginId = path.basename(filePath, '.py');
  
  // 如果已加载，先卸载
  if (pythonProcesses.has(pluginId)) {
    await unloadPythonPlugin(pluginId);
  }

  // 创建运行时脚本路径
  const runtimeDir = path.join(path.dirname(filePath), '.runtime');
  if (!fs.existsSync(runtimeDir)) {
    fs.mkdirSync(runtimeDir, { recursive: true });
  }
  
  const runtimeScript = path.join(runtimeDir, 'plugin_runtime.py');
  fs.writeFileSync(runtimeScript, getPythonRuntimeScript());

  // 读取插件文件内容，检查是否需要注入运行时代码
  const pluginContent = fs.readFileSync(filePath, 'utf-8');
  
  // 创建临时启动脚本
  const bootstrapScript = path.join(runtimeDir, `bootstrap_${pluginId}.py`);
  const bootstrapContent = `
import sys
import os

# 添加运行时目录到路径
runtime_dir = ${JSON.stringify(runtimeDir)}
if runtime_dir not in sys.path:
    sys.path.insert(0, runtime_dir)

# 导入运行时
from plugin_runtime import Plugin, set_plugin, get_plugin

# 执行插件代码
plugin_file = ${JSON.stringify(filePath)}
plugin_dir = os.path.dirname(plugin_file)
if plugin_dir not in sys.path:
    sys.path.insert(0, plugin_dir)

# 读取并执行插件文件
with open(plugin_file, 'r', encoding='utf-8') as f:
    plugin_code = f.read()

# 在插件目录的上下文中执行
exec_globals = {
    '__name__': '__main__',
    '__file__': plugin_file,
    'Plugin': Plugin,
    'set_plugin': set_plugin,
    'get_plugin': get_plugin,
}
exec(plugin_code, exec_globals)

# 启动消息处理
from plugin_runtime import MessageHandler
handler = MessageHandler()
handler.run()
`;
  fs.writeFileSync(bootstrapScript, bootstrapContent);

  return new Promise((resolve, reject) => {
    const proc = spawn(pythonCmd, [bootstrapScript], {
      cwd: path.dirname(filePath),
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const pluginProcess: PythonPluginProcess = {
      process: proc,
      pluginId,
      pluginPath: filePath,
      pendingRequests: new Map(),
      initialized: false
    };

    let stderrBuffer = '';

    proc.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter((line: string) => line.trim());
      for (const line of lines) {
        handlePythonResponse(pluginId, line, ctx);
      }
    });

    proc.stderr?.on('data', (data: Buffer) => {
      stderrBuffer += data.toString();
      // Python 调试信息输出到控制台
      console.log(`[Python ${pluginId}] ${data.toString().trim()}`);
    });

    proc.on('error', (error) => {
      addSystemLog('ERROR', 'plugin', `Python 插件进程错误: ${pluginId} - ${error}`);
      pythonProcesses.delete(pluginId);
    });

    proc.on('close', (code) => {
      addSystemLog('INFO', 'plugin', `Python 插件进程退出: ${pluginId} (code: ${code})`);
      if (stderrBuffer) {
        console.log(`[Python ${pluginId}] stderr: ${stderrBuffer}`);
      }
      pythonProcesses.delete(pluginId);
    });

    pythonProcesses.set(pluginId, pluginProcess);

    // 等待进程启动后获取元数据
    setTimeout(async () => {
      try {
        const meta = await sendPythonRequest(pluginId, 'get_meta', {}) as PythonPluginMeta;
        
        if (!meta || !meta.id || !meta.name) {
          throw new Error('Python 插件元数据无效');
        }

        pluginProcess.meta = meta;
        pluginProcess.initialized = true;

        // 调用 on_load
        await sendPythonRequest(pluginId, 'on_load', {});

        // 创建 Plugin 对象
        const plugin: Plugin = {
          id: meta.id,
          name: meta.name,
          version: meta.version || '1.0.0',
          description: meta.description || '',
          author: meta.author,
          enabled: true,
          priority: meta.priority,
          
          onLoad: async (ctx) => {
            globalContext = ctx;
          },
          
          onUnload: async () => {
            await unloadPythonPlugin(meta.id);
          },
          
          onMessage: async (event, ctx) => {
            globalContext = ctx;
            try {
              const result = await sendPythonRequest(pluginId, 'on_message', {
                message: event.message,
                isGroup: event.isGroup,
                senderId: event.senderId,
                senderName: event.senderName,
                groupId: event.groupId
              });
              return result === true;
            } catch (error) {
              addSystemLog('ERROR', 'plugin', `Python 插件消息处理错误: ${error}`);
              return false;
            }
          },
          
          commands: meta.commands?.map(cmd => ({
            name: cmd.name,
            aliases: cmd.aliases,
            description: cmd.description,
            usage: cmd.usage,
            pattern: cmd.pattern,
            permission: cmd.permission as any,
            cooldown: cmd.cooldown,
            hidden: cmd.hidden,
            handler: async (args, event, ctx) => {
              globalContext = ctx;
              try {
                const result = await sendPythonRequest(pluginId, 'execute_command', {
                  command: cmd.name,
                  args,
                  event: {
                    message: event.message,
                    isGroup: event.isGroup,
                    senderId: event.senderId,
                    senderName: event.senderName,
                    groupId: event.groupId
                  }
                });
                return result;
              } catch (error) {
                addSystemLog('ERROR', 'plugin', `Python 插件命令执行错误: ${cmd.name} - ${error}`);
                return `命令执行错误: ${error}`;
              }
            }
          }))
        };

        addSystemLog('INFO', 'plugin', `Python 插件已加载: ${meta.name} v${meta.version}`);
        resolve(plugin);
      } catch (error) {
        addSystemLog('ERROR', 'plugin', `加载 Python 插件失败: ${filePath} - ${error}`);
        proc.kill();
        pythonProcesses.delete(pluginId);
        resolve(null);
      }
    }, 500);
  });
}

/**
 * 卸载 Python 插件
 */
export async function unloadPythonPlugin(pluginId: string): Promise<boolean> {
  const pluginProcess = pythonProcesses.get(pluginId);
  if (!pluginProcess) {
    return false;
  }

  try {
    // 尝试调用 on_unload
    try {
      await sendPythonRequest(pluginId, 'on_unload', {}, 5000);
    } catch {
      // 忽略卸载时的错误
    }

    // 终止进程
    pluginProcess.process.kill();

    // 清理待处理的请求
    for (const [id, pending] of pluginProcess.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('插件已卸载'));
    }

    pythonProcesses.delete(pluginId);
    addSystemLog('INFO', 'plugin', `Python 插件已卸载: ${pluginId}`);
    return true;
  } catch (error) {
    addSystemLog('ERROR', 'plugin', `卸载 Python 插件失败: ${pluginId} - ${error}`);
    return false;
  }
}

/**
 * 检查是否是 Python 插件文件
 */
export function isPythonPlugin(filePath: string): boolean {
  return filePath.endsWith('.py');
}

/**
 * 获取所有运行中的 Python 插件
 */
export function getRunningPythonPlugins(): string[] {
  return Array.from(pythonProcesses.keys());
}

/**
 * 停止所有 Python 插件
 */
export async function stopAllPythonPlugins(): Promise<void> {
  const pluginIds = Array.from(pythonProcesses.keys());
  for (const pluginId of pluginIds) {
    await unloadPythonPlugin(pluginId);
  }
}
