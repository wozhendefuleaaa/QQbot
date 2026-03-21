#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
集成测试 - 模拟Node.js与Python插件的完整通信
测试内嵌运行时脚本的功能
"""

import sys
import json
import subprocess
import threading
import time
import os

# 测试用的简单插件代码
TEST_PLUGIN_CODE = '''
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
        self._command_defs = []
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

def set_plugin(p):
    global _plugin_instance
    _plugin_instance = p

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
'''


def test_python_plugin_communication():
    """测试与Python插件的通信"""
    print("=" * 60)
    print("Python 插件通信集成测试")
    print("=" * 60)
    
    # 启动Python进程
    print("\n📋 启动Python插件进程...")
    proc = subprocess.Popen(
        ['python3', '-c', TEST_PLUGIN_CODE],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1
    )
    
    results = []
    
    def read_responses():
        """读取响应的线程"""
        while True:
            line = proc.stdout.readline()
            if not line:
                break
            try:
                data = json.loads(line.strip())
                results.append(data)
            except:
                pass
    
    reader_thread = threading.Thread(target=read_responses, daemon=True)
    reader_thread.start()
    
    def send_request(method, params=None, request_id="1"):
        """发送请求到Python插件"""
        request = {
            'type': 'request',
            'id': request_id,
            'method': method,
            'params': params or {}
        }
        proc.stdin.write(json.dumps(request) + '\n')
        proc.stdin.flush()
        time.sleep(0.1)  # 等待响应
    
    try:
        # 测试1: 获取元数据
        print("\n📋 测试1: 获取插件元数据 (get_meta)")
        send_request('get_meta', request_id='1')
        
        # 查找响应
        meta_response = None
        for r in results:
            if r.get('id') == '1' and r.get('type') == 'response':
                meta_response = r
                break
        
        if meta_response and 'result' in meta_response:
            meta = meta_response['result']
            print(f"   插件ID: {meta.get('id')}")
            print(f"   插件名: {meta.get('name')}")
            print(f"   版本: {meta.get('version')}")
            assert meta.get('id') == 'test-plugin', "元数据ID不匹配"
            print("   ✅ 通过")
        else:
            print(f"   ❌ 失败: {meta_response}")
            return False
        
        # 测试2: 加载插件
        print("\n📋 测试2: 加载插件 (on_load)")
        results.clear()
        send_request('on_load', request_id='2')
        
        load_response = None
        for r in results:
            if r.get('id') == '2' and r.get('type') == 'response':
                load_response = r
                break
        
        if load_response and load_response.get('result') == True:
            print("   ✅ 通过")
        else:
            print(f"   ❌ 失败: {load_response}")
            return False
        
        # 测试3: 消息处理
        print("\n📋 测试3: 消息处理 (on_message)")
        results.clear()
        send_request('on_message', {'raw_message': '#test hello'}, request_id='3')
        
        msg_response = None
        for r in results:
            if r.get('id') == '3' and r.get('type') == 'response':
                msg_response = r
                break
        
        if msg_response:
            print("   ✅ 通过")
        else:
            print(f"   ❌ 失败")
            return False
        
        # 测试4: 卸载插件
        print("\n📋 测试4: 卸载插件 (on_unload)")
        results.clear()
        send_request('on_unload', request_id='4')
        
        unload_response = None
        for r in results:
            if r.get('id') == '4' and r.get('type') == 'response':
                unload_response = r
                break
        
        if unload_response and unload_response.get('result') == True:
            print("   ✅ 通过")
        else:
            print(f"   ❌ 失败: {unload_response}")
            return False
        
        print("\n" + "=" * 60)
        print("🎉 所有通信测试通过！")
        print("=" * 60)
        return True
        
    finally:
        proc.terminate()
        proc.wait()


if __name__ == "__main__":
    success = test_python_plugin_communication()
    sys.exit(0 if success else 1)
