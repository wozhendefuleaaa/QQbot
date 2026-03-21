/**
 * 消息类型测试插件
 * 用于测试各种QQ消息类型的发送功能
 */

import { Plugin, PluginContext, MessageEvent } from '../core/plugin-types.js';
import {
  sendMarkdownMessage,
  sendArkMessage,
  sendEmbedMessage,
  sendKeyboardMessage,
  sendMixedMessage,
  QQ_MSG_TYPE,
  QQMarkdownPayload,
  QQArkPayload,
  QQEmbedPayload,
  QQKeyboardPayload,
  QQMessagePayload
} from '../modules/platform/gateway-message.js';
import { accounts } from '../core/store.js';

const testMessageTypesPlugin: Plugin = {
  id: 'test-message-types',
  name: '消息类型测试',
  version: '1.0.0',
  description: '测试各种QQ消息类型的发送功能',
  author: 'System',
  enabled: true,
  priority: 100,

  // 插件加载时调用
  onLoad: async (ctx) => {
    ctx.log('info', '消息类型测试插件已加载');
  },

  // 插件卸载时调用
  onUnload: async () => {
    console.log('[test-message-types] 插件已卸载');
  },

  // 处理消息
  onMessage: async (event, ctx) => {
    // 处理键盘按钮回调
    if (event.message.text.startsWith('callback_')) {
      ctx.log('info', `收到键盘回调: ${event.message.text}`);
      return true; // 拦截消息
    }
    return false;
  },

  // 定义命令
  commands: [
    {
      name: 'test-markdown',
      description: '测试发送Markdown消息',
      handler: async (args, event, ctx) => {
        try {
          // 获取第一个可用账号
          const account = accounts.values().next().value;
          if (!account) {
            return '错误：没有可用的账号';
          }

          const targetId = event.isGroup ? event.groupId! : event.senderId;
          const targetType = event.isGroup ? 'group' as const : 'user' as const;

          const markdown: QQMarkdownPayload = {
            custom_template_id: '102070712_1702526065',
            params: [
              {
                key: 'title',
                values: ['测试Markdown消息']
              },
              {
                key: 'content',
                values: ['这是一条测试消息，用于验证Markdown消息发送功能。']
              }
            ]
          };

          const result = await sendMarkdownMessage(account, targetId, markdown, event.message.id, targetType);
          
          if (result.success) {
            ctx.log('info', 'Markdown消息发送成功');
            return 'Markdown消息发送成功！';
          } else {
            return 'Markdown消息发送失败';
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          ctx.log('error', `发送Markdown消息异常: ${errMsg}`);
          return `发送失败: ${errMsg}`;
        }
      }
    },
    {
      name: 'test-ark',
      description: '测试发送Ark卡片消息',
      handler: async (args, event, ctx) => {
        try {
          const account = accounts.values().next().value;
          if (!account) {
            return '错误：没有可用的账号';
          }

          const targetId = event.isGroup ? event.groupId! : event.senderId;
          const targetType = event.isGroup ? 'group' as const : 'user' as const;

          const ark: QQArkPayload = {
            template_id: '23',
            kv: [
              {
                key: '#DESC#',
                value: '测试描述'
              },
              {
                key: '#PROMPT#',
                value: '测试提示'
              },
              {
                key: '#TITLE#',
                value: '测试标题'
              },
              {
                key: '#META#',
                obj: [
                  {
                    obj_kv: [
                      {
                        key: 'title',
                        value: '卡片标题'
                      },
                      {
                        key: 'desc',
                        value: '卡片描述内容'
                      }
                    ]
                  }
                ]
              }
            ]
          };

          const result = await sendArkMessage(account, targetId, ark, event.message.id, targetType);
          
          if (result.success) {
            ctx.log('info', 'Ark消息发送成功');
            return 'Ark卡片消息发送成功！';
          } else {
            return 'Ark消息发送失败';
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          ctx.log('error', `发送Ark消息异常: ${errMsg}`);
          return `发送失败: ${errMsg}`;
        }
      }
    },
    {
      name: 'test-embed',
      description: '测试发送Embed嵌入式消息',
      handler: async (args, event, ctx) => {
        try {
          const account = accounts.values().next().value;
          if (!account) {
            return '错误：没有可用的账号';
          }

          const targetId = event.isGroup ? event.groupId! : event.senderId;
          const targetType = event.isGroup ? 'group' as const : 'user' as const;

          const embed: QQEmbedPayload = {
            title: '嵌入式卡片测试',
            prompt: '这是一条嵌入式消息',
            fields: [
              {
                name: '字段1: 这是第一段描述文字'
              },
              {
                name: '字段2: 这是第二段描述文字'
              }
            ]
          };

          const result = await sendEmbedMessage(account, targetId, embed, event.message.id, targetType);
          
          if (result.success) {
            ctx.log('info', 'Embed消息发送成功');
            return 'Embed嵌入式消息发送成功！';
          } else {
            return 'Embed消息发送失败';
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          ctx.log('error', `发送Embed消息异常: ${errMsg}`);
          return `发送失败: ${errMsg}`;
        }
      }
    },
    {
      name: 'test-keyboard',
      description: '测试发送键盘消息',
      handler: async (args, event, ctx) => {
        try {
          const account = accounts.values().next().value;
          if (!account) {
            return '错误：没有可用的账号';
          }

          const targetId = event.isGroup ? event.groupId! : event.senderId;
          const targetType = event.isGroup ? 'group' as const : 'user' as const;

          const keyboard: QQKeyboardPayload = {
            rows: [
              {
                buttons: [
                  {
                    id: 'btn_1',
                    render_data: {
                      label: '按钮1',
                      visited_label: '已点击按钮1',
                      style: 0
                    },
                    action: {
                      type: 2,
                      permission: {
                        type: 2
                      },
                      data: 'callback_btn1',
                      click_limit: 10
                    }
                  },
                  {
                    id: 'btn_2',
                    render_data: {
                      label: '按钮2',
                      visited_label: '已点击按钮2',
                      style: 1
                    },
                    action: {
                      type: 2,
                      permission: {
                        type: 2
                      },
                      data: 'callback_btn2',
                      click_limit: 10
                    }
                  }
                ]
              },
              {
                buttons: [
                  {
                    id: 'btn_3',
                    render_data: {
                      label: '按钮3',
                      visited_label: '已点击按钮3',
                      style: 2
                    },
                    action: {
                      type: 2,
                      permission: {
                        type: 2
                      },
                      data: 'callback_btn3',
                      click_limit: 10
                    }
                  }
                ]
              }
            ]
          };

          const result = await sendKeyboardMessage(account, targetId, keyboard, '请选择一个按钮：', event.message.id, targetType);
          
          if (result.success) {
            ctx.log('info', '键盘消息发送成功');
            return '键盘消息发送成功！';
          } else {
            return '键盘消息发送失败';
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          ctx.log('error', `发送键盘消息异常: ${errMsg}`);
          return `发送失败: ${errMsg}`;
        }
      }
    },
    {
      name: 'test-mixed',
      description: '测试发送混合消息（Markdown + 键盘）',
      handler: async (args, event, ctx) => {
        try {
          const account = accounts.values().next().value;
          if (!account) {
            return '错误：没有可用的账号';
          }

          const targetId = event.isGroup ? event.groupId! : event.senderId;
          const targetType = event.isGroup ? 'group' as const : 'user' as const;

          const keyboard: QQKeyboardPayload = {
            rows: [
              {
                buttons: [
                  {
                    id: 'confirm_btn',
                    render_data: {
                      label: '确认',
                      visited_label: '已确认',
                      style: 2
                    },
                    action: {
                      type: 2,
                      permission: {
                        type: 2
                      },
                      data: 'callback_confirm',
                      click_limit: 1
                    }
                  },
                  {
                    id: 'cancel_btn',
                    render_data: {
                      label: '取消',
                      visited_label: '已取消',
                      style: 1
                    },
                    action: {
                      type: 2,
                      permission: {
                        type: 2
                      },
                      data: 'callback_cancel',
                      click_limit: 1
                    }
                  }
                ]
              }
            ]
          };

          const payload: QQMessagePayload = {
            msg_type: QQ_MSG_TYPE.KEYBOARD,
            content: '请确认您的操作：',
            keyboard
          };

          const result = await sendMixedMessage(account, targetId, payload, targetType);
          
          if (result.success) {
            ctx.log('info', '混合消息发送成功');
            return '混合消息发送成功！';
          } else {
            return '混合消息发送失败';
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          ctx.log('error', `发送混合消息异常: ${errMsg}`);
          return `发送失败: ${errMsg}`;
        }
      }
    },
    {
      name: 'test-all',
      description: '测试所有消息类型',
      handler: async (args, event, ctx) => {
        const results: string[] = [];
        
        // 测试Markdown
        try {
          const account = accounts.values().next().value;
          if (account) {
            const targetId = event.isGroup ? event.groupId! : event.senderId;
            const targetType = event.isGroup ? 'group' as const : 'user' as const;
            
            const markdown: QQMarkdownPayload = {
              custom_template_id: '102070712_1702526065',
              params: [{ key: 'title', values: ['测试'] }, { key: 'content', values: ['Markdown测试'] }]
            };
            
            const res = await sendMarkdownMessage(account, targetId, markdown, event.message.id, targetType);
            results.push(`Markdown: ${res.success ? '✅' : '❌'}`);
          }
        } catch (e) {
          results.push('Markdown: ❌');
        }

        // 测试Ark
        try {
          const account = accounts.values().next().value;
          if (account) {
            const targetId = event.isGroup ? event.groupId! : event.senderId;
            const targetType = event.isGroup ? 'group' as const : 'user' as const;
            
            const ark: QQArkPayload = {
              template_id: '23',
              kv: [
                { key: '#TITLE#', value: '测试' },
                { key: '#META#', obj: [{ obj_kv: [{ key: 'title', value: '标题' }, { key: 'desc', value: '描述' }] }] }
              ]
            };
            
            const res = await sendArkMessage(account, targetId, ark, event.message.id, targetType);
            results.push(`Ark: ${res.success ? '✅' : '❌'}`);
          }
        } catch (e) {
          results.push('Ark: ❌');
        }

        // 测试Embed
        try {
          const account = accounts.values().next().value;
          if (account) {
            const targetId = event.isGroup ? event.groupId! : event.senderId;
            const targetType = event.isGroup ? 'group' as const : 'user' as const;
            
            const embed: QQEmbedPayload = {
              title: '测试',
              fields: [{ name: '字段1' }]
            };
            
            const res = await sendEmbedMessage(account, targetId, embed, event.message.id, targetType);
            results.push(`Embed: ${res.success ? '✅' : '❌'}`);
          }
        } catch (e) {
          results.push('Embed: ❌');
        }

        // 测试Keyboard
        try {
          const account = accounts.values().next().value;
          if (account) {
            const targetId = event.isGroup ? event.groupId! : event.senderId;
            const targetType = event.isGroup ? 'group' as const : 'user' as const;
            
            const keyboard: QQKeyboardPayload = {
              rows: [{
                buttons: [{
                  id: 'test_btn',
                  render_data: { label: '测试按钮' },
                  action: { type: 2, permission: { type: 2 }, data: 'test_callback' }
                }]
              }]
            };
            
            const res = await sendKeyboardMessage(account, targetId, keyboard, '测试', event.message.id, targetType);
            results.push(`Keyboard: ${res.success ? '✅' : '❌'}`);
          }
        } catch (e) {
          results.push('Keyboard: ❌');
        }

        return `消息类型测试结果：\n${results.join('\n')}`;
      }
    }
  ]
};

export default testMessageTypesPlugin;
