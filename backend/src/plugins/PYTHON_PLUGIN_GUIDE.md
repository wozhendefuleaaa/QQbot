# Python 插件开发指南

本文档介绍如何使用 Python 编写 wawa-qqbot 插件。

## 基本结构

Python 插件是一个继承自 `Plugin` 基类的 Python 文件，放置在 `backend/src/plugins/` 目录下，文件名以 `.py` 结尾。

```python
from plugin_runtime import Plugin, set_plugin

class MyPlugin(Plugin):
    # 插件元数据（必须设置）
    id = 'my-plugin'
    name = '我的插件'
    version = '1.0.0'
    description = '插件描述'
    author = '作者名'
    priority = 100  # 优先级，数字越小越先执行
    
    def __init__(self):
        super().__init__()
        # 注册命令
        self._setup_commands()
    
    def _setup_commands(self):
        @self.command(
            name='hello',
            description='打招呼',
            usage='/hello [名字]'
        )
        def hello_command(args, event, ctx):
            name = args[0] if args else '朋友'
            return f'你好，{name}！'

# 创建并注册插件实例
plugin = MyPlugin()
set_plugin(plugin)
```

## 插件元数据

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 插件唯一标识符 |
| `name` | string | 是 | 插件名称 |
| `version` | string | 是 | 插件版本 |
| `description` | string | 是 | 插件描述 |
| `author` | string | 否 | 作者名 |
| `priority` | int | 否 | 优先级，默认 100 |

## 生命周期钩子

### `on_load()`

插件加载时调用。

```python
def on_load(self):
    self.ctx.log('info', f'{self.name} 已加载')
```

### `on_unload()`

插件卸载时调用。

```python
def on_unload(self):
    self.ctx.log('info', f'{self.name} 已卸载')
```

### `on_message(event)`

收到消息时调用。

```python
def on_message(self, event):
    message = event.get('message', '')
    sender = event.get('senderName', '未知')
    
    # 处理消息
    if '关键词' in message:
        self.ctx.log('info', f'{sender} 发送了包含关键词的消息')
        return True  # 返回 True 阻止其他插件处理
    
    return False  # 返回 False 继续传递
```

事件对象包含以下字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `message` | string | 消息文本 |
| `isGroup` | bool | 是否群消息 |
| `senderId` | string | 发送者 ID |
| `senderName` | string | 发送者名称 |
| `groupId` | string | 群 ID（群消息时） |

## 注册命令

使用 `@self.command()` 装饰器注册命令：

```python
@self.command(
    name='命令名',           # 必填
    aliases=['别名1', '别名2'],  # 可选，命令别名
    description='命令描述',   # 必填
    usage='/命令名 <参数>',   # 可选，使用说明
    permission='public',     # 可选，权限级别：public/admin/owner
    cooldown=5,              # 可选，冷却时间（秒）
    hidden=False             # 可选，是否在帮助中隐藏
)
def my_command(args, event, ctx):
    """命令处理函数"""
    # args: 参数列表
    # event: 消息事件对象
    # ctx: 插件上下文
    
    # 返回字符串会自动发送给用户
    return '命令执行结果'
```

## 插件上下文 (ctx)

通过 `self.ctx` 访问插件上下文：

### 发送消息

```python
self.ctx.send_message(target_id, target_type, text)
```

- `target_id`: 目标 ID（用户 ID 或群 ID）
- `target_type`: 目标类型，`'user'` 或 `'group'`
- `text`: 消息文本

### 记录日志

```python
self.ctx.log('info', '信息日志')
self.ctx.log('warn', '警告日志')
self.ctx.log('error', '错误日志')
```

### 获取连接账号

```python
account_id = self.ctx.get_connected_account_id()
```

## 完整示例

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
完整的 Python 插件示例
"""

from plugin_runtime import Plugin, set_plugin
from datetime import datetime
import random


class ExamplePlugin(Plugin):
    """示例插件"""
    
    id = 'python-example'
    name = 'Python 示例插件'
    version = '1.0.0'
    description = '演示 Python 插件功能'
    author = 'wawa-qqbot'
    priority = 100
    
    def __init__(self):
        super().__init__()
        self._setup_commands()
    
    def _setup_commands(self):
        """注册所有命令"""
        
        @self.command(
            name='hello',
            aliases=['你好', 'hi'],
            description='打招呼',
            usage='/hello [名字]',
            cooldown=5
        )
        def hello_command(args, event, ctx):
            name = args[0] if args else event.get('senderName', '朋友')
            return f'你好，{name}！很高兴见到你！'
        
        @self.command(
            name='time',
            aliases=['时间'],
            description='获取当前时间'
        )
        def time_command(args, event, ctx):
            now = datetime.now()
            return f'现在是：{now.strftime("%Y-%m-%d %H:%M:%S")}'
        
        @self.command(
            name='roll',
            aliases=['掷骰子', 'dice'],
            description='掷骰子',
            usage='/roll [最大值]'
        )
        def roll_command(args, event, ctx):
            max_val = 100
            if args:
                try:
                    max_val = int(args[0])
                except ValueError:
                    pass
            result = random.randint(1, max_val)
            return f'🎲 掷出了 {result}（1-{max_val}）'
    
    def on_load(self):
        self.ctx.log('info', f'{self.name} v{self.version} 已加载')
    
    def on_unload(self):
        self.ctx.log('info', f'{self.name} 已卸载')
    
    def on_message(self, event):
        message = event.get('message', '')
        
        # 自动回复示例
        if 'ping' in message.lower():
            self.ctx.log('info', '收到 ping，准备回复 pong')
            # 注意：这里返回的文本不会被自动发送
            # 需要使用 on_message 返回值或注册命令来响应
            return False
        
        return False


# 注册插件
plugin = ExamplePlugin()
set_plugin(plugin)
```

## 注意事项

1. **文件编码**：Python 插件文件应使用 UTF-8 编码
2. **文件位置**：插件文件放在 `backend/src/plugins/` 目录
3. **文件命名**：建议使用小写字母和连字符，如 `my-plugin.py`
4. **唯一 ID**：每个插件的 `id` 必须唯一
5. **错误处理**：命令处理函数中的异常会被捕获并记录日志
6. **性能考虑**：避免在命令处理中执行耗时操作

## 调试

Python 插件的输出（stdout/stderr）会被记录到系统日志中。可以使用 `print()` 或 `self.ctx.log()` 输出调试信息。

```python
def my_command(args, event, ctx):
    print(f'调试信息：收到参数 {args}')  # 输出到 stderr
    ctx.log('info', '处理命令')  # 记录到系统日志
    return '结果'
```
