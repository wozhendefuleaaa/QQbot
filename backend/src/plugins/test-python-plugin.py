#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试插件 - 用于验证Python插件系统
"""

import sys
import os

# 添加当前目录到路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


class TestPlugin:
    """测试插件类"""
    
    def __init__(self):
        self.name = "test-plugin"
        self.version = "1.0.0"
        self.description = "Python插件系统测试"
        self.author = "测试者"
        self.commands = [
            {
                "name": "test",
                "description": "测试命令 - 验证插件加载成功",
                "aliases": ["测试", "t"],
                "usage": "#test [参数]",
                "examples": ["#test", "#test hello", "#测试"]
            },
            {
                "name": "add",
                "description": "加法计算器",
                "aliases": ["加"],
                "usage": "#add <数字1> <数字2>",
                "examples": ["#add 1 2", "#加 10 20"]
            },
            {
                "name": "info",
                "description": "显示插件信息",
                "aliases": ["信息", "i"],
                "usage": "#info",
                "examples": ["#info"]
            }
        ]
        self._loaded = False
    
    def on_load(self):
        """插件加载时调用"""
        self._loaded = True
        self._log("INFO", f"测试插件 [{self.name}] v{self.version} 加载成功!")
        self._log("INFO", f"Python版本: {sys.version}")
        return True
    
    def on_unload(self):
        """插件卸载时调用"""
        self._loaded = False
        self._log("INFO", f"测试插件 [{self.name}] 已卸载")
        return True
    
    def on_message(self, event):
        """消息处理"""
        # 记录收到的消息
        self._log("DEBUG", f"收到消息: {event.get('raw_message', '')[:50]}")
        return False  # 返回False表示不拦截消息
    
    def handle_command(self, cmd_name, args, event, ctx):
        """处理命令"""
        self._log("INFO", f"处理命令: {cmd_name}, 参数: {args}")
        
        if cmd_name == "test":
            return self._handle_test(args, event)
        elif cmd_name == "add":
            return self._handle_add(args, event)
        elif cmd_name == "info":
            return self._handle_info(args, event)
        
        return None
    
    def _handle_test(self, args, event):
        """处理test命令"""
        if args:
            return f"🧪 测试成功！收到参数: {' '.join(args)}"
        return "🧪 Python插件系统测试成功！\n📋 使用 #test <参数> 传递参数\n➕ 使用 #add <a> <b> 进行加法运算\nℹ️ 使用 #info 查看插件信息"
    
    def _handle_add(self, args, event):
        """处理add命令"""
        if len(args) < 2:
            return "❌ 请提供两个数字，例如: #add 1 2"
        
        try:
            a = float(args[0])
            b = float(args[1])
            result = a + b
            
            # 如果是整数，显示为整数
            if result == int(result):
                result = int(result)
            if a == int(a):
                a = int(a)
            if b == int(b):
                b = int(b)
            
            return f"🧮 {a} + {b} = {result}"
        except ValueError:
            return "❌ 请提供有效的数字，例如: #add 1 2"
    
    def _handle_info(self, args, event):
        """处理info命令"""
        info = f"""📦 插件信息
━━━━━━━━━━━━━━━━━━━━
🏷️ 名称: {self.name}
📌 版本: {self.version}
📝 描述: {self.description}
👤 作者: {self.author}
🐍 Python: {sys.version.split()[0]}
📊 状态: {'✅ 已加载' if self._loaded else '❌ 未加载'}
━━━━━━━━━━━━━━━━━━━━
可用命令:
  #test - 测试命令
  #add - 加法计算
  #info - 显示此信息"""
        return info
    
    def _log(self, level, message):
        """发送日志事件"""
        event = {
            "type": "event",
            "method": "log",
            "params": {
                "level": level,
                "message": message
            }
        }
        self._send_event(event)
    
    def _send_event(self, event):
        """发送事件到Node.js"""
        import json
        print(json.dumps(event), flush=True)


# 插件实例
plugin = TestPlugin()


def get_meta():
    """返回插件元数据"""
    return {
        "id": "test-plugin",
        "name": plugin.name,
        "version": plugin.version,
        "description": plugin.description,
        "author": plugin.author,
        "commands": plugin.commands
    }


def on_load():
    """插件加载"""
    return plugin.on_load()


def on_unload():
    """插件卸载"""
    return plugin.on_unload()


def on_message(event):
    """消息处理"""
    return plugin.on_message(event)


def handle_command(cmd_name, args, event, ctx):
    """命令处理"""
    return plugin.handle_command(cmd_name, args, event, ctx)
