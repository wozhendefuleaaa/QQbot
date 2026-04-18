const fs = require('fs');
const path = require('path');
const { sendMarkdownMessage } = require('../../modules/platform/gateway.js');
const { accounts } = require('../../core/store.js');

// 运势数据
const fortuneData = {
  levels: [
    { level: '大吉', stars: '★★★★★★☆☆', description: '万物化育，繁荣之象，专心一意，始能成功', explanation: '富贵达得显宙，子孙繁茂福绵绵，一身平安益寿，福禄双全享千锺。' },
    { level: '吉', stars: '★★★★★☆☆☆', description: '天时地利，人和俱备，大事可成，名利双收', explanation: '诸事顺利，心想事成，财运亨通，贵人相助。' },
    { level: '中吉', stars: '★★★★☆☆☆☆', description: '虽有波折，终能克服，努力不懈，必有所成', explanation: '困难暂时，坚持到底，渐入佳境，收获可期。' },
    { level: '小吉', stars: '★★★☆☆☆☆☆', description: '平平淡淡，稳扎稳打，积少成多，循序渐进', explanation: '稳步前行，不可急躁，耐心等待，终有回报。' },
    { level: '凶', stars: '★★☆☆☆☆☆☆', description: '诸事不顺，宜静不宜动，保守为上，等待时机', explanation: '困难重重，不宜冒险，养精蓄锐，等待转机。' }
  ],
  // 特殊运势
  special: [
    { level: '超吉', stars: '★★★★★★★★', description: '上上大吉，鸿运当头，心想事成，万事如意', explanation: '得天之助，百事顺利，财源广进，福泽深厚。' },
    { level: '大凶', stars: '★☆☆☆☆☆☆☆', description: '诸事不利，宜静守，忌冒险，等待时机', explanation: '困难重重，不宜妄动，修身养性，以待良机。' }
  ]
};

// 数据存储路径
const dataDir = path.join(__dirname, 'data');
const fortuneFile = path.join(dataDir, 'fortune.json');

// 确保数据目录存在
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 读取运势数据
function readFortuneData() {
  try {
    if (fs.existsSync(fortuneFile)) {
      const data = fs.readFileSync(fortuneFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('读取运势数据失败:', error);
  }
  return { users: {} };
}

// 保存运势数据
function saveFortuneData(data) {
  try {
    fs.writeFileSync(fortuneFile, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('保存运势数据失败:', error);
  }
}

// 获取今日日期（YYYY-MM-DD）
function getToday() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// 随机生成运势
function generateFortune() {
  const allFortunes = [...fortuneData.levels, ...fortuneData.special];
  const randomIndex = Math.floor(Math.random() * allFortunes.length);
  return allFortunes[randomIndex];
}

// 主插件
const fortunePlugin = {
  id: 'fortune-plugin',
  name: '今日运势',
  version: '1.0.0',
  description: '每日运势查询与悔签功能',
  enabled: true,
  priority: 100,

  onLoad: async (ctx) => {
    ctx.log('info', '今日运势插件已加载');
  },

  onUnload: async () => {
    console.log('今日运势插件已卸载');
  },

  onMessage: async (event, ctx) => {
    const message = event.text;
    const userId = event.userId;
    const groupId = event.groupId;
    const targetId = groupId || userId;
    const targetType = groupId ? 'group' : 'user';

    // 处理 #今日运势 或 #运势 命令
    if (message.includes('#今日运势') || message.includes('#运势')) {
      await handleFortuneQuery(userId, targetId, targetType, ctx);
      return true;
    }

    // 处理 #悔签 或 #重新抽取运势 命令
    if (message.includes('#悔签') || message.includes('#重新抽取运势')) {
      await handleRetryFortune(userId, targetId, targetType, ctx);
      return true;
    }

    return false;
  },

  commands: [
    {
      name: 'fortune',
      aliases: ['今日运势', '运势'],
      description: '查询今日运势',
      permission: 'public',
      cooldown: 60,
      handler: async (args, event, ctx) => {
        const userId = event.userId;
        const groupId = event.groupId;
        const targetId = groupId || userId;
        const targetType = groupId ? 'group' : 'user';
        await handleFortuneQuery(userId, targetId, targetType, ctx);
      }
    },
    {
      name: 'retry-fortune',
      aliases: ['悔签', '重新抽取运势'],
      description: '每日重抽一次运势',
      permission: 'public',
      cooldown: 60,
      handler: async (args, event, ctx) => {
        const userId = event.userId;
        const groupId = event.groupId;
        const targetId = groupId || userId;
        const targetType = groupId ? 'group' : 'user';
        await handleRetryFortune(userId, targetId, targetType, ctx);
      }
    }
  ]
};

// 处理运势查询
async function handleFortuneQuery(userId, targetId, targetType, ctx) {
  const today = getToday();
  const data = readFortuneData();

  // 检查用户今日是否已有运势
  if (data.users[userId] && data.users[userId].date === today) {
    const userData = data.users[userId];
    const fortune = userData.fortune;
    await sendFortuneMessage(userId, targetId, targetType, fortune, ctx);
  } else {
    // 生成新运势
    const fortune = generateFortune();
    // 保存运势数据
    data.users[userId] = {
      date: today,
      fortune: fortune,
      retryUsed: false
    };
    saveFortuneData(data);
    await sendFortuneMessage(userId, targetId, targetType, fortune, ctx);
  }
}

// 处理悔签
async function handleRetryFortune(userId, targetId, targetType, ctx) {
  const today = getToday();
  const data = readFortuneData();

  // 检查用户今日是否已有运势
  if (!data.users[userId] || data.users[userId].date !== today) {
    await ctx.sendMessage(targetId, targetType, '您今日还未查询运势，请先使用 #今日运势 命令查询');
    return;
  }

  // 检查是否已使用悔签
  if (data.users[userId].retryUsed) {
    await ctx.sendMessage(targetId, targetType, '您今日已经使用过悔签机会，明天再来吧！');
    return;
  }

  // 生成新运势
  const fortune = generateFortune();
  // 更新运势数据
  data.users[userId] = {
    date: today,
    fortune: fortune,
    retryUsed: true
  };
  saveFortuneData(data);
  await sendFortuneMessage(userId, targetId, targetType, fortune, ctx);
}

// 发送运势消息
async function sendFortuneMessage(userId, targetId, targetType, fortune, ctx) {
  try {
    // 获取当前连接的账号ID
    const accountId = ctx.getConnectedAccountId();
    if (!accountId) {
      throw new Error('平台未连接');
    }
    
    // 找到对应的账号对象
    const account = accounts.find(a => a.id === accountId);
    if (!account) {
      throw new Error('未找到账号信息');
    }
    
    // 构建 Markdown 消息
    const markdown = {
      custom_template_id: '',
      params: [
        {
          key: 'title',
          values: ['今日运势']
        },
        {
          key: 'user',
          values: [userId]
        },
        {
          key: 'level',
          values: [fortune.level]
        },
        {
          key: 'stars',
          values: [fortune.stars]
        },
        {
          key: 'description',
          values: [fortune.description]
        },
        {
          key: 'explanation',
          values: [fortune.explanation]
        }
      ]
    };
    
    // 尝试发送 Markdown 消息
    const result = await sendMarkdownMessage(account, targetId, markdown, undefined, targetType);
    
    if (result.success) {
      return;
    }
  } catch (error) {
    console.error('发送 Markdown 消息失败:', error);
  }
  
  // 回退到文本消息
  const message = `@${userId}\n您的今日运势为：\n${fortune.level}\n${fortune.stars}\n\n<${fortune.description}>\n${fortune.explanation}\n\n图片源自网络|如有侵权|请反馈删除\n仅供娱乐|相信科学|请勿迷信`;
  await ctx.sendMessage(targetId, targetType, message);
}

module.exports = fortunePlugin;