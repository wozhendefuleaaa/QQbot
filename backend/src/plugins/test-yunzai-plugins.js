/**
 * 云崽插件测试套件
 * 测试各种云崽插件格式的兼容性
 */

// ==================== 测试1: 基础类格式插件 ====================
export class TestBasicPlugin {
  name = '测试基础插件';
  dsc = '测试基础云崽插件格式';
  event = 'message';
  priority = 5000;
  enable = true;

  rule = [
    {
      reg: '^#测试基础$',
      fnc: 'testBasic',
      describe: '基础测试命令'
    }
  ];

  async testBasic(e) {
    await e.reply('✅ 基础插件格式测试通过！');
    return true;
  }
}

// ==================== 测试2: 权限控制插件 ====================
export class TestPermissionPlugin {
  name = '测试权限插件';
  dsc = '测试权限控制系统';
  event = 'message';
  priority = 4000;

  rule = [
    {
      reg: '^#主人命令$',
      fnc: 'masterCmd',
      permission: 'master',
      describe: '仅主人可用'
    },
    {
      reg: '^#管理命令$',
      fnc: 'adminCmd',
      permission: 'admin',
      describe: '管理员可用'
    },
    {
      reg: '^#公开命令$',
      fnc: 'publicCmd',
      permission: 'all',
      describe: '所有人可用'
    }
  ];

  async masterCmd(e) {
    await e.reply('✅ 主人权限验证通过！');
    return true;
  }

  async adminCmd(e) {
    await e.reply('✅ 管理员权限验证通过！');
    return true;
  }

  async publicCmd(e) {
    await e.reply('✅ 公开命令测试通过！');
    return true;
  }
}

// ==================== 测试3: segment 消息构建器插件 ====================
export class TestSegmentPlugin {
  name = '测试Segment插件';
  dsc = '测试消息段构建器';
  event = 'message';
  priority = 3000;

  rule = [
    {
      reg: '^#测试文本$',
      fnc: 'testText',
      describe: '测试文本消息'
    },
    {
      reg: '^#测试图片$',
      fnc: 'testImage',
      describe: '测试图片消息'
    },
    {
      reg: '^#测试AT$',
      fnc: 'testAt',
      describe: '测试@消息'
    },
    {
      reg: '^#测试混合$',
      fnc: 'testMixed',
      describe: '测试混合消息'
    }
  ];

  async testText(e) {
    const segment = global.segment;
    if (segment) {
      const msg = segment.text('✅ segment.text 测试通过！');
      await e.reply(msg);
    } else {
      await e.reply('✅ 文本消息测试通过！');
    }
    return true;
  }

  async testImage(e) {
    const segment = global.segment;
    if (segment) {
      const msg = segment.image('https://via.placeholder.com/150x150?text=Test+Image');
      await e.reply(msg);
    } else {
      await e.reply('⚠️ segment 不可用，请检查适配器');
    }
    return true;
  }

  async testAt(e) {
    const segment = global.segment;
    if (segment) {
      const at = segment.at(e.user_id, e.sender?.nickname || '用户');
      await e.reply([at, ' ✅ @消息测试通过！']);
    } else {
      await e.reply(`@${e.user_id} ✅ @消息测试通过！`);
    }
    return true;
  }

  async testMixed(e) {
    const segment = global.segment;
    if (segment) {
      const messages = [
        segment.text('混合消息测试：\n'),
        segment.at(e.user_id),
        segment.text(' ✅ 混合消息测试通过！')
      ];
      await e.reply(messages);
    } else {
      await e.reply('✅ 混合消息测试通过！');
    }
    return true;
  }
}

// ==================== 测试4: 正则匹配插件 ====================
export class TestRegexPlugin {
  name = '测试正则插件';
  dsc = '测试正则表达式匹配';
  event = 'message';
  priority = 2000;

  rule = [
    {
      reg: '^#复读\\s+(.+)$',
      fnc: 'repeat',
      describe: '复读消息'
    },
    {
      reg: '^#计算\\s*(\\d+)\\s*\\+\\s*(\\d+)$',
      fnc: 'calc',
      describe: '简单计算'
    },
    {
      reg: '^#查询\\s*(\\S+)$',
      fnc: 'query',
      describe: '查询测试'
    }
  ];

  async repeat(e) {
    const match = e.message.match(/^#复读\s+(.+)$/);
    if (match) {
      await e.reply(`复读：${match[1]}`);
      return true;
    }
    return false;
  }

  async calc(e) {
    const match = e.message.match(/^#计算\s*(\d+)\s*\+\s*(\d+)$/);
    if (match) {
      const result = parseInt(match[1]) + parseInt(match[2]);
      await e.reply(`计算结果：${match[1]} + ${match[2]} = ${result}`);
      return true;
    }
    return false;
  }

  async query(e) {
    const match = e.message.match(/^#查询\s*(\S+)$/);
    if (match) {
      await e.reply(`查询结果：${match[1]} - ✅ 正则匹配测试通过！`);
      return true;
    }
    return false;
  }
}

// ==================== 测试5: 事件属性插件 ====================
export class TestEventPlugin {
  name = '测试事件插件';
  dsc = '测试事件对象属性';
  event = 'message';
  priority = 1000;

  rule = [
    {
      reg: '^#事件信息$',
      fnc: 'eventInfo',
      describe: '显示事件信息'
    },
    {
      reg: '^#我的信息$',
      fnc: 'myInfo',
      describe: '显示用户信息'
    },
    {
      reg: '^#群信息$',
      fnc: 'groupInfo',
      describe: '显示群信息'
    }
  ];

  async eventInfo(e) {
    const info = [
      '📋 事件信息：',
      `消息ID: ${e.message_id}`,
      `消息内容: ${e.message?.slice(0, 50)}${(e.message?.length || 0) > 50 ? '...' : ''}`,
      `是否群消息: ${e.isGroup ? '是' : '否'}`,
      `是否私聊: ${e.isPrivate ? '是' : '否'}`,
      `是否@机器人: ${e.atBot ? '是' : '否'}`
    ];
    await e.reply(info.join('\n'));
    return true;
  }

  async myInfo(e) {
    const info = [
      '👤 用户信息：',
      `用户ID: ${e.user_id}`,
      `昵称: ${e.sender?.nickname || '未知'}`,
      `角色: ${e.sender?.role || '成员'}`
    ];
    await e.reply(info.join('\n'));
    return true;
  }

  async groupInfo(e) {
    if (!e.isGroup) {
      await e.reply('⚠️ 此命令仅在群聊中可用');
      return true;
    }
    const info = [
      '👥 群信息：',
      `群ID: ${e.group_id}`,
      `群名: ${e.group?.group_name || '未知'}`
    ];
    await e.reply(info.join('\n'));
    return true;
  }
}

// ==================== 测试6: accept 方法插件 ====================
export class TestAcceptPlugin {
  name = '测试Accept插件';
  dsc = '测试accept方法';
  event = 'message';
  priority = 100;

  // accept 方法会在规则匹配之前执行
  async accept(e) {
    // 检测特定关键词并记录日志
    if (e.message?.includes('测试accept')) {
      const logger = global.logger;
      if (logger) {
        logger.info('[TestAcceptPlugin] 检测到测试关键词');
      }
      // 不拦截，继续执行规则
      return false;
    }
    return false;
  }

  rule = [
    {
      reg: '^#accept测试$',
      fnc: 'testAccept',
      describe: '测试accept方法'
    }
  ];

  async testAccept(e) {
    await e.reply('✅ accept 方法测试通过！');
    return true;
  }
}

// ==================== 测试7: 多规则插件 ====================
export class TestMultiRulePlugin {
  name = '测试多规则插件';
  dsc = '测试多个规则处理';
  event = 'message';
  priority = 6000;

  rule = [
    { reg: '^#帮助$', fnc: 'help' },
    { reg: '^#菜单$', fnc: 'help' },
    { reg: '^#功能$', fnc: 'help' },
    { reg: '^#状态$', fnc: 'status' },
    { reg: '^#版本$', fnc: 'version' },
    { reg: '^#关于$', fnc: 'about' }
  ];

  async help(e) {
    const helpText = [
      '📖 帮助菜单',
      '',
      '#帮助 - 显示帮助',
      '#状态 - 查看状态',
      '#版本 - 查看版本',
      '#关于 - 关于信息',
      '',
      '✅ 多规则测试通过！'
    ].join('\n');
    await e.reply(helpText);
    return true;
  }

  async status(e) {
    await e.reply('📊 状态：运行中\n✅ 多规则测试通过！');
    return true;
  }

  async version(e) {
    await e.reply('📌 版本：v1.0.0\n✅ 多规则测试通过！');
    return true;
  }

  async about(e) {
    await e.reply('ℹ️ 云崽插件适配器测试插件\n✅ 多规则测试通过！');
    return true;
  }
}

// ==================== 导出所有测试插件 ====================

// 单独导出每个插件类
export const testBasicPlugin = new TestBasicPlugin();
export const testPermissionPlugin = new TestPermissionPlugin();
export const testSegmentPlugin = new TestSegmentPlugin();
export const testRegexPlugin = new TestRegexPlugin();
export const testEventPlugin = new TestEventPlugin();
export const testAcceptPlugin = new TestAcceptPlugin();
export const testMultiRulePlugin = new TestMultiRulePlugin();

// 默认导出所有插件数组
export default [
  TestBasicPlugin,
  TestPermissionPlugin,
  TestSegmentPlugin,
  TestRegexPlugin,
  TestEventPlugin,
  TestAcceptPlugin,
  TestMultiRulePlugin
];
