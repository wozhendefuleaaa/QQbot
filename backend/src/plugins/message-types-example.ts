/**
 * QQ消息类型示例插件
 * 展示如何使用各种QQ消息类型：Markdown、Ark、Embed、Keyboard
 */

import { BotAccount } from '../types.js';
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

/**
 * 发送Markdown消息示例
 * 使用自定义模板发送格式化消息
 */
export async function sendMarkdownExample(
  account: BotAccount,
  targetId: string,
  targetType: 'user' | 'group' = 'user'
): Promise<void> {
  const markdown: QQMarkdownPayload = {
    custom_template_id: 'your_template_id', // 替换为你的模板ID
    params: [
      {
        key: 'title',
        values: ['欢迎消息']
      },
      {
        key: 'content',
        values: ['这是一条Markdown格式的消息']
      }
    ]
  };

  await sendMarkdownMessage(account, targetId, markdown, undefined, targetType);
}

/**
 * 发送Ark消息示例
 * 使用卡片模板展示结构化信息
 */
export async function sendArkExample(
  account: BotAccount,
  targetId: string,
  targetType: 'user' | 'group' = 'user'
): Promise<void> {
  const ark: QQArkPayload = {
    template_id: '23', // QQ官方卡片模板ID
    kv: [
      {
        key: '#DESC#',
        value: '描述信息'
      },
      {
        key: '#PROMPT#',
        value: '提示信息'
      },
      {
        key: '#TITLE#',
        value: '标题'
      },
      {
        key: '#META#',
        obj: [
          {
            obj_kv: [
              {
                key: 'title',
                value: '内容标题'
              },
              {
                key: 'desc',
                value: '内容描述'
              }
            ]
          }
        ]
      }
    ]
  };

  await sendArkMessage(account, targetId, ark, undefined, targetType);
}

/**
 * 发送Embed消息示例
 * 使用嵌入式卡片展示富文本信息
 */
export async function sendEmbedExample(
  account: BotAccount,
  targetId: string,
  targetType: 'user' | 'group' = 'user'
): Promise<void> {
  const embed: QQEmbedPayload = {
    title: '嵌入式卡片标题',
    prompt: '提示信息',
    thumbnail: {
      url: 'https://example.com/thumbnail.jpg'
    },
    fields: [
      {
        name: '字段1: 这是一段描述文字'
      },
      {
        name: '字段2: 这是另一段描述文字'
      }
    ]
  };

  await sendEmbedMessage(account, targetId, embed, undefined, targetType);
}

/**
 * 发送键盘消息示例
 * 使用交互式按钮增强用户体验
 */
export async function sendKeyboardExample(
  account: BotAccount,
  targetId: string,
  targetType: 'user' | 'group' = 'user'
): Promise<void> {
  const keyboard: QQKeyboardPayload = {
    rows: [
      {
        buttons: [
          {
            id: 'button_1',
            render_data: {
              label: '按钮1',
              visited_label: '已点击按钮1',
              style: 0 // 0: 蓝色线框, 1: 灰色线框, 2: 绿色线框
            },
            action: {
              type: 2, // 2: 回调回调
              permission: {
                type: 2, // 0: 指定用户, 1: 指定角色, 2: 所有人
              },
              data: 'callback_data_1',
              click_limit: 5
            }
          },
          {
            id: 'button_2',
            render_data: {
              label: '按钮2',
              visited_label: '已点击按钮2',
              style: 1
            },
            action: {
              type: 2,
              permission: {
                type: 2,
              },
              data: 'callback_data_2',
              click_limit: 5
            }
          }
        ]
      },
      {
        buttons: [
          {
            id: 'button_3',
            render_data: {
              label: '按钮3',
              visited_label: '已点击按钮3',
              style: 2
            },
            action: {
              type: 2,
              permission: {
                type: 2,
              },
              data: 'callback_data_3',
              click_limit: 5
            }
          }
        ]
      }
    ]
  };

  await sendKeyboardMessage(account, targetId, keyboard, '请选择操作：', undefined, targetType);
}

/**
 * 发送混合消息示例
 * 同时包含文本和键盘按钮
 */
export async function sendMixedMessageExample(
  account: BotAccount,
  targetId: string,
  targetType: 'user' | 'group' = 'user'
): Promise<void> {
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
                type: 2,
              },
              data: 'confirm_action',
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
                type: 2,
              },
              data: 'cancel_action',
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

  await sendMixedMessage(account, targetId, payload, targetType);
}

/**
 * 发送带Markdown的键盘消息
 * 同时包含Markdown格式文本和键盘按钮
 */
export async function sendMarkdownWithKeyboardExample(
  account: BotAccount,
  targetId: string,
  targetType: 'user' | 'group' = 'user'
): Promise<void> {
  const markdown: QQMarkdownPayload = {
    custom_template_id: 'your_template_id',
    params: [
      {
        key: 'title',
        values: ['操作确认']
      },
      {
        key: 'content',
        values: ['请确认以下操作：']
      }
    ]
  };

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
                type: 2,
              },
              data: 'confirm_action',
              click_limit: 1
            }
          }
        ]
      }
    ]
  };

  const payload: QQMessagePayload = {
    msg_type: QQ_MSG_TYPE.MARKDOWN,
    markdown,
    keyboard
  };

  await sendMixedMessage(account, targetId, payload, targetType);
}

/**
 * 处理键盘按钮回调
 * 在收到按钮点击事件时调用
 */
export function handleKeyboardCallback(
  callbackData: string,
  userId: string,
  groupId?: string
): string {
  switch (callbackData) {
    case 'callback_data_1':
      return '您点击了按钮1';
    case 'callback_data_2':
      return '您点击了按钮2';
    case 'callback_data_3':
      return '您点击了按钮3';
    case 'confirm_action':
      return '操作已确认';
    case 'cancel_action':
      return '操作已取消';
    default:
      return '未知操作';
  }
}
