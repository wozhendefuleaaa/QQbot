/**
 * 云崽插件示例 - 演示云崽插件适配
 * 
 * 这个插件展示了云崽插件格式：
 * 1. 使用 plugin 基类
 * 2. 使用 rule 规则匹配
 * 3. 使用 segment 消息构建器
 */

// 云崽插件格式
export class ExampleYunzaiPlugin {
  name = '云崽示例插件';
  dsc = '演示云崽插件适配功能';
  event = 'message';
  priority = 1000;
  enable = true;

  rule: Array<{
    reg?: string | RegExp;
    atBot?: boolean;
    fnc: string;
    describe?: string;
  }> = [
    {
      reg: '^#你好$',
      fnc: 'hello',
      describe: '打招呼'
    },
    {
      reg: '^#时间$',
      fnc: 'getTime',
      describe: '获取当前时间'
    },
    {
      reg: '^#复读 (.+)$',
      fnc: 'repeat',
      describe: '复读消息'
    },
    {
      reg: '^#图片$',
      fnc: 'sendImage',
      describe: '发送图片示例'
    },
    {
      reg: '^#at$',
      fnc: 'atSender',
      describe: '@发送者'
    }
  ];

  // 打招呼
  async hello(e: any): Promise<boolean> {
    await e.reply('你好！我是通过云崽插件适配运行的机器人 🎉');
    return true;
  }

  // 获取时间
  async getTime(e: any): Promise<boolean> {
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
    await e.reply(`当前时间：${timeStr}`);
    return true;
  }

  // 复读消息
  async repeat(e: any): Promise<boolean> {
    const match = e.message.match(/^#复读 (.+)$/);
    if (match) {
      await e.reply(`你说了：${match[1]}`);
      return true;
    }
    return false;
  }

  // 发送图片示例
  async sendImage(e: any): Promise<boolean> {
    // 使用 segment 构建消息
    const segment = (global as any).segment;
    if (segment) {
      const image = segment.image('https://via.placeholder.com/150');
      await e.reply(image);
    } else {
      await e.reply('[图片示例] segment 不可用');
    }
    return true;
  }

  // @发送者
  async atSender(e: any): Promise<boolean> {
    const segment = (global as any).segment;
    if (segment) {
      const at = segment.at(e.user_id, e.sender.nickname);
      await e.reply([at, ' 我@了你！']);
    } else {
      await e.reply(`@${e.sender.nickname} 我@了你！`);
    }
    return true;
  }
}

// 默认导出
export default ExampleYunzaiPlugin;

// 也支持直接导出实例
export const exampleYunzaiPlugin = new ExampleYunzaiPlugin();
