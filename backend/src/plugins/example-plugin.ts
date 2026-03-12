/**
 * 示例插件 - 演示插件系统功能
 * 
 * 这个插件展示了如何：
 * 1. 定义命令和别名
 * 2. 处理消息事件
 * 3. 发送消息
 */

import { Plugin, PluginContext, MessageEvent } from '../core/plugin-types.js';

const examplePlugin: Plugin = {
  id: 'example-plugin',
  name: '示例插件',
  version: '1.0.0',
  description: '演示插件系统功能的示例插件',
  author: 'System',
  enabled: true,
  priority: 100,

  // 插件加载时调用
  onLoad: async (ctx) => {
    ctx.log('info', '示例插件已加载');
  },

  // 插件卸载时调用
  onUnload: async () => {
    console.log('[example-plugin] 插件已卸载');
  },

  // 处理消息
  onMessage: async (event, ctx) => {
    // 记录收到的消息
    if (event.isGroup) {
      ctx.log('info', `收到群消息 [${event.groupId}]: ${event.message.text.slice(0, 50)}`);
    } else {
      ctx.log('info', `收到私聊消息 [${event.senderId}]: ${event.message.text.slice(0, 50)}`);
    }
    
    // 返回 false 表示不拦截消息，让其他插件继续处理
    return false;
  },

  // 定义命令
  commands: [
    {
      name: 'hello',
      aliases: ['你好', 'hi'],
      description: '打招呼',
      usage: '/hello [名字]',
      handler: async (args, event, ctx) => {
        const name = args[0] || '朋友';
        return `你好，${name}！我是机器人助手 😊`;
      }
    },
    {
      name: 'ping',
      description: '测试机器人响应',
      handler: async (_args, _event, ctx) => {
        ctx.log('info', '收到 ping 命令');
        return 'pong! 🏓';
      }
    },
    {
      name: 'time',
      aliases: ['时间'],
      description: '获取当前时间',
      handler: async () => {
        const now = new Date();
        const timeStr = now.toLocaleString('zh-CN', {
          timeZone: 'Asia/Shanghai',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        return `当前时间：${timeStr}`;
      }
    },
    {
      name: 'echo',
      description: '复读消息',
      usage: '/echo <消息内容>',
      handler: async (args, _event, ctx) => {
        if (args.length === 0) {
          return '请输入要复读的内容，例如：/echo 你好';
        }
        const content = args.join(' ');
        ctx.log('info', `复读消息: ${content}`);
        return content;
      }
    }
  ]
};

export default examplePlugin;
