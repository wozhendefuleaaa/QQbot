/**
 * 插件系统测试脚本
 * 测试插件加载和命令匹配功能
 */

import { loadAllPlugins, getLoadedPlugins, dispatchMessage, getAvailableCommands } from './core/plugin-manager.js';
import { initYunzaiGlobals, createYunzaiBot } from './core/yunzai/index.js';
import { platformStatus, accounts } from './core/store.js';

// 模拟账号数据
accounts.push({
  id: 'test-account',
  name: '测试账号',
  appId: 'test-app-id',
  appSecret: 'test-secret',
  appSecretMasked: '***',
  status: 'ONLINE',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

// 设置连接状态
platformStatus.connected = true;
platformStatus.connectedAccountId = 'test-account';

// 初始化 Yunzai 全局对象
const bot = createYunzaiBot('test-account', {}, {
  sendMessage: async (targetId, targetType, text) => {
    console.log(`[Mock Send] ${targetType}:${targetId} - ${text}`);
  }
});
initYunzaiGlobals(bot);

async function runTests() {
  console.log('===== 插件系统测试 =====\n');
  
  // 测试1: 加载插件
  console.log('测试1: 加载所有插件');
  try {
    await loadAllPlugins();
    const plugins = getLoadedPlugins();
    console.log(`✓ 已加载 ${plugins.length} 个插件`);
    plugins.forEach(p => {
      console.log(`  - ${p.name} (${p.id}): ${p.commands?.length || 0} 个命令`);
      if (p.commands) {
        p.commands.forEach(cmd => {
          console.log(`    - ${cmd.name}: pattern=${cmd.pattern || 'none'}`);
        });
      }
    });
  } catch (error) {
    console.log(`✗ 加载插件失败: ${error}`);
  }
  
  console.log('');
  
  // 测试2: 获取可用命令
  console.log('测试2: 获取可用命令');
  const commands = getAvailableCommands();
  console.log(`✓ 共 ${commands.length} 个可用命令`);
  commands.forEach(c => {
    console.log(`  - ${c.plugin}: ${c.command.name} (pattern: ${c.command.pattern || 'none'})`);
  });
  
  console.log('');
  
  // 测试3: 测试消息匹配
  console.log('测试3: 测试消息匹配');
  
  const testMessages = [
    '#签到',
    '签到',
    '#签到排行榜',
    '#我的签到',
    '#你好',
    '#时间',
    '/help',
    '帮助',
    '随便发一条消息'
  ];
  
  for (const msg of testMessages) {
    console.log(`\n测试消息: "${msg}"`);
    
    const message = {
      id: `test-${Date.now()}`,
      accountId: 'test-account',
      conversationId: 'test-conversation',
      direction: 'in' as const,
      text: msg,
      createdAt: new Date().toISOString()
    };
    
    try {
      const handled = await dispatchMessage(message, 'test-user', 'user');
      console.log(`  结果: ${handled ? '已处理' : '未匹配'}`);
    } catch (error) {
      console.log(`  错误: ${error}`);
    }
  }
  
  console.log('\n===== 测试完成 =====');
}

runTests().catch(console.error);
