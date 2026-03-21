/**
 * Python插件适配器测试脚本
 * 测试Node.js与Python插件的完整集成
 */

import { spawn } from 'child_process';
import * as path from 'path';

// 测试用的Python插件代码
const TEST_PLUGIN_CODE = `
import sys
import json

class TestPlugin:
    def __init__(self):
        self.id = "test-plugin"
        self.name = "测试插件"
        self.version = "1.0.0"
        self.description = "用于测试的插件"
        self.author = "测试者"
        self._commands = {}
        self._command_defs = [
            {"name": "hello", "description": "问候命令", "aliases": ["hi"]}
        ]
        self.ctx = None
    
    def on_load(self):
        return True
    
    def on_unload(self):
        return True
    
    def on_message(self, event):
        return None
    
    def get_meta(self):
        return {
            'id': self.id,
            'name': self.name,
            'version': self.version,
            'description': self.description,
            'author': self.author,
            'priority': 100,
            'commands': self._command_defs
        }

_plugin_instance = TestPlugin()

def get_plugin():
    return _plugin_instance

class PluginContext:
    def send_message(self, target_id, target_type, text):
        event = {'type': 'event', 'method': 'send_message',
                 'params': {'targetId': target_id, 'targetType': target_type, 'text': text}}
        print(json.dumps(event), flush=True)
    
    def log(self, level, message):
        event = {'type': 'event', 'method': 'log', 'params': {'level': level, 'message': message}}
        print(json.dumps(event), flush=True)

get_plugin().ctx = PluginContext()

class MessageHandler:
    def __init__(self):
        self._request_handlers = {
            'get_meta': self._handle_get_meta,
            'on_load': self._handle_on_load,
            'on_unload': self._handle_on_unload,
            'on_message': self._handle_on_message,
            'execute_command': self._handle_execute_command,
        }
    
    def _handle_get_meta(self, params):
        return get_plugin().get_meta()
    
    def _handle_on_load(self, params):
        return get_plugin().on_load()
    
    def _handle_on_unload(self, params):
        return get_plugin().on_unload()
    
    def _handle_on_message(self, params):
        return get_plugin().on_message(params)
    
    def _handle_execute_command(self, params):
        plugin = get_plugin()
        cmd_name = params.get('command')
        args = params.get('args', [])
        event = params.get('event', {})
        if cmd_name in plugin._commands:
            return plugin._commands[cmd_name](args, event, plugin.ctx)
        return None
    
    def run(self):
        while True:
            try:
                line = sys.stdin.readline()
                if not line:
                    break
                message = json.loads(line.strip())
                if message.get('type') == 'request':
                    request_id = message.get('id')
                    method = message.get('method')
                    params = message.get('params', {})
                    response = {'type': 'response', 'id': request_id}
                    if method in self._request_handlers:
                        try:
                            result = self._request_handlers[method](params)
                            response['result'] = result
                        except Exception as e:
                            response['error'] = str(e)
                    else:
                        response['error'] = f'Unknown method: {method}'
                    print(json.dumps(response), flush=True)
            except json.JSONDecodeError as e:
                sys.stderr.write(f'JSON error: {e}\\n')
            except Exception as e:
                sys.stderr.write(f'Error: {e}\\n')

if __name__ == '__main__':
    handler = MessageHandler()
    handler.run()
`;

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  data?: any;
}

async function runTest(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Python 插件适配器集成测试 (Node.js)');
  console.log('='.repeat(60));

  const results: TestResult[] = [];

  // 启动Python进程
  console.log('\n📋 启动Python插件进程...');
  const proc = spawn('python3', ['-c', TEST_PLUGIN_CODE], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const responses = new Map<string, any>();
  let responseBuffer = '';

  proc.stdout?.on('data', (data: Buffer) => {
    responseBuffer += data.toString();
    const lines = responseBuffer.split('\n');
    responseBuffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        try {
          const response = JSON.parse(line.trim());
          if (response.type === 'response' && response.id) {
            responses.set(response.id, response);
          } else if (response.type === 'event') {
            console.log(`   📩 收到事件: ${response.method}`);
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }
  });

  proc.stderr?.on('data', (data: Buffer) => {
    console.error(`   ⚠️ Python stderr: ${data.toString()}`);
  });

  // 等待进程启动
  await new Promise(resolve => setTimeout(resolve, 500));

  // 发送请求的辅助函数
  function sendRequest(id: string, method: string, params: any = {}): void {
    const request = {
      type: 'request',
      id,
      method,
      params
    };
    proc.stdin?.write(JSON.stringify(request) + '\n');
  }

  // 等待响应
  async function waitForResponse(id: string, timeout: number = 5000): Promise<any> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (responses.has(id)) {
        return responses.get(id);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return null;
  }

  try {
    // 测试1: 获取元数据
    console.log('\n📋 测试1: 获取插件元数据 (get_meta)');
    sendRequest('test-1', 'get_meta');
    const metaResponse = await waitForResponse('test-1');

    if (metaResponse?.result) {
      const meta = metaResponse.result;
      console.log(`   插件ID: ${meta.id}`);
      console.log(`   插件名: ${meta.name}`);
      console.log(`   版本: ${meta.version}`);
      results.push({ name: 'get_meta', passed: meta.id === 'test-plugin', data: meta });
      console.log('   ✅ 通过');
    } else {
      results.push({ name: 'get_meta', passed: false, error: '无响应' });
      console.log('   ❌ 失败: 无响应');
    }

    // 测试2: 加载插件
    console.log('\n📋 测试2: 加载插件 (on_load)');
    sendRequest('test-2', 'on_load');
    const loadResponse = await waitForResponse('test-2');

    if (loadResponse?.result === true) {
      results.push({ name: 'on_load', passed: true });
      console.log('   ✅ 通过');
    } else {
      results.push({ name: 'on_load', passed: false, error: JSON.stringify(loadResponse) });
      console.log(`   ❌ 失败: ${JSON.stringify(loadResponse)}`);
    }

    // 测试3: 消息处理
    console.log('\n📋 测试3: 消息处理 (on_message)');
    sendRequest('test-3', 'on_message', { raw_message: '#hello' });
    const msgResponse = await waitForResponse('test-3');

    if (msgResponse) {
      results.push({ name: 'on_message', passed: true });
      console.log('   ✅ 通过');
    } else {
      results.push({ name: 'on_message', passed: false, error: '无响应' });
      console.log('   ❌ 失败: 无响应');
    }

    // 测试4: 卸载插件
    console.log('\n📋 测试4: 卸载插件 (on_unload)');
    sendRequest('test-4', 'on_unload');
    const unloadResponse = await waitForResponse('test-4');

    if (unloadResponse?.result === true) {
      results.push({ name: 'on_unload', passed: true });
      console.log('   ✅ 通过');
    } else {
      results.push({ name: 'on_unload', passed: false, error: JSON.stringify(unloadResponse) });
      console.log(`   ❌ 失败: ${JSON.stringify(unloadResponse)}`);
    }

  } finally {
    // 关闭进程
    proc.stdin?.end();
    proc.kill();
  }

  // 输出测试结果
  console.log('\n' + '='.repeat(60));
  console.log('测试结果汇总');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  for (const result of results) {
    const status = result.passed ? '✅' : '❌';
    console.log(`  ${status} ${result.name}`);
    if (result.error) {
      console.log(`      错误: ${result.error}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`总计: ${passed}/${total} 测试通过`);
  console.log('='.repeat(60));

  if (passed === total) {
    console.log('\n🎉 所有测试通过！Python插件适配器工作正常');
    process.exit(0);
  } else {
    console.log('\n❌ 部分测试失败');
    process.exit(1);
  }
}

runTest().catch(err => {
  console.error('测试执行失败:', err);
  process.exit(1);
});
