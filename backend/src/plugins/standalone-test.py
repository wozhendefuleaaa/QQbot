#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
独立测试脚本 - 测试Python插件的基本功能
"""

import sys
import json

# 模拟测试插件
class TestPlugin:
    def __init__(self):
        self.name = "test-plugin"
        self.version = "1.0.0"
        self._loaded = False
    
    def on_load(self):
        self._loaded = True
        return True
    
    def on_unload(self):
        self._loaded = False
        return True
    
    def handle_command(self, cmd_name, args, event, ctx):
        if cmd_name == "test":
            if args:
                return f"测试成功！参数: {' '.join(args)}"
            return "测试成功！"
        elif cmd_name == "add":
            if len(args) >= 2:
                try:
                    a, b = float(args[0]), float(args[1])
                    return f"{a} + {b} = {a + b}"
                except ValueError:
                    return "请提供有效数字"
            return "需要两个数字参数"
        return None

plugin = TestPlugin()

def get_meta():
    return {
        "id": "test-plugin",
        "name": plugin.name,
        "version": plugin.version,
        "commands": [
            {"name": "test", "description": "测试命令"},
            {"name": "add", "description": "加法"}
        ]
    }

def on_load():
    return plugin.on_load()

def on_unload():
    return plugin.on_unload()

def handle_command(cmd_name, args, event, ctx):
    return plugin.handle_command(cmd_name, args, event, ctx)


# 测试代码
if __name__ == "__main__":
    print("=" * 50)
    print("Python 插件独立测试")
    print("=" * 50)
    
    # 测试1: 元数据
    print("\n📋 测试1: 获取插件元数据")
    meta = get_meta()
    print(f"   插件ID: {meta['id']}")
    print(f"   插件名: {meta['name']}")
    print(f"   版本: {meta['version']}")
    print(f"   命令数: {len(meta['commands'])}")
    assert meta['id'] == 'test-plugin', "元数据测试失败"
    print("   ✅ 通过")
    
    # 测试2: 加载
    print("\n📋 测试2: 插件加载")
    result = on_load()
    assert result == True, "加载测试失败"
    assert plugin._loaded == True, "加载状态测试失败"
    print("   ✅ 通过")
    
    # 测试3: 命令处理
    print("\n📋 测试3: 命令处理")
    
    # 测试test命令
    result = handle_command("test", [], {}, {})
    print(f"   #test -> {result}")
    assert "测试成功" in result, "test命令测试失败"
    print("   ✅ #test 通过")
    
    # 测试test命令带参数
    result = handle_command("test", ["hello", "world"], {}, {})
    print(f"   #test hello world -> {result}")
    assert "hello world" in result, "test命令参数测试失败"
    print("   ✅ #test 带参数 通过")
    
    # 测试add命令
    result = handle_command("add", ["1", "2"], {}, {})
    print(f"   #add 1 2 -> {result}")
    assert "3" in result, "add命令测试失败"
    print("   ✅ #add 通过")
    
    # 测试add命令小数
    result = handle_command("add", ["1.5", "2.5"], {}, {})
    print(f"   #add 1.5 2.5 -> {result}")
    assert "4" in result, "add命令小数测试失败"
    print("   ✅ #add 小数 通过")
    
    # 测试4: 卸载
    print("\n📋 测试4: 插件卸载")
    result = on_unload()
    assert result == True, "卸载测试失败"
    assert plugin._loaded == False, "卸载状态测试失败"
    print("   ✅ 通过")
    
    print("\n" + "=" * 50)
    print("🎉 所有测试通过！Python插件系统工作正常")
    print("=" * 50)
