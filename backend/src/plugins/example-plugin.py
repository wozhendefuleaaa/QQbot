#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Python 插件示例
演示如何使用 Python 编写 wawa-qqbot 插件
"""

from plugin_runtime import Plugin, set_plugin


class ExamplePlugin(Plugin):
    """示例插件类"""
    
    # 插件元数据（必须设置）
    id = 'python-example'
    name = 'Python 示例插件'
    version = '1.0.0'
    description = '这是一个 Python 插件示例，演示基本的插件功能'
    author = 'wawa-qqbot'
    priority = 100
    
    def __init__(self):
        super().__init__()
        # 注册命令
        self._setup_commands()
    
    def _setup_commands(self):
        """设置命令"""
        
        # 使用装饰器注册命令
        @self.command(
            name='hello',
            aliases=['你好', 'hi'],
            description='打招呼',
            usage='/hello [名字]',
            permission='public',
            cooldown=5
        )
        def hello_command(args, event, ctx):
            """打招呼命令"""
            name = args[0] if args else event.get('senderName', '朋友')
            return f'你好，{name}！很高兴见到你！'
        
        @self.command(
            name='echo',
            aliases=['复读', 'repeat'],
            description='复读消息',
            usage='/echo <消息>',
            permission='public'
        )
        def echo_command(args, event, ctx):
            """复读命令"""
            if not args:
                return '请输入要复读的内容，例如：/echo 你好'
            message = ' '.join(args)
            return f'复读：{message}'
        
        @self.command(
            name='time',
            aliases=['时间', '现在几点'],
            description='获取当前时间',
            permission='public'
        )
        def time_command(args, event, ctx):
            """时间命令"""
            from datetime import datetime
            now = datetime.now()
            return f'现在是：{now.strftime("%Y-%m-%d %H:%M:%S")}'
        
        @self.command(
            name='calc',
            aliases=['计算', 'calculator'],
            description='简单计算器',
            usage='/calc <表达式>',
            permission='public'
        )
        def calc_command(args, event, ctx):
            """计算器命令"""
            if not args:
                return '请输入计算表达式，例如：/calc 1+1'
            
            expr = ' '.join(args)
            try:
                # 安全起见，只允许基本数学运算
                import re
                if not re.match(r'^[\d\s\+\-\*\/\(\)\.\,]+$', expr):
                    return '表达式包含不允许的字符'
                
                # 替换中文符号
                expr = expr.replace('，', '.').replace('（', '(').replace('）', ')')
                result = eval(expr)
                return f'计算结果：{expr} = {result}'
            except Exception as e:
                return f'计算错误：{str(e)}'
        
        @self.command(
            name='roll',
            aliases=['掷骰子', 'dice'],
            description='掷骰子',
            usage='/roll [最大值]',
            permission='public'
        )
        def roll_command(args, event, ctx):
            """掷骰子命令"""
            import random
            max_val = 100
            if args:
                try:
                    max_val = int(args[0])
                    if max_val < 1:
                        max_val = 100
                except ValueError:
                    pass
            result = random.randint(1, max_val)
            return f'🎲 掷出了 {result}（1-{max_val}）'
    
    def on_load(self):
        """插件加载时调用"""
        self.ctx.log('info', f'{self.name} v{self.version} 已加载')
    
    def on_unload(self):
        """插件卸载时调用"""
        self.ctx.log('info', f'{self.name} 已卸载')
    
    def on_message(self, event):
        """消息处理器
        
        Args:
            event: 消息事件对象，包含：
                - message: 消息文本
                - isGroup: 是否群消息
                - senderId: 发送者ID
                - senderName: 发送者名称
                - groupId: 群ID（如果是群消息）
        
        Returns:
            bool: 返回 True 表示消息已处理，不再传递给其他插件
        """
        message = event.get('message', '')
        
        # 示例：自动回复特定关键词
        if '你好吗' in message:
            # 使用 ctx 发送消息
            # 注意：这里返回的文本会被自动发送
            # 如果需要主动发送消息，可以使用 ctx.send_message
            return False  # 返回 False 继续传递给其他插件
        
        # 示例：检测特定消息
        if message == 'ping':
            self.ctx.log('info', '收到 ping 消息')
        
        return False  # 返回 False 让其他插件继续处理


# 创建并注册插件实例
plugin = ExamplePlugin()
set_plugin(plugin)
