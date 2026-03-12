const examplePlugin = {
  id: "example-plugin",
  name: "\u793A\u4F8B\u63D2\u4EF6",
  version: "1.0.0",
  description: "\u6F14\u793A\u63D2\u4EF6\u7CFB\u7EDF\u529F\u80FD\u7684\u793A\u4F8B\u63D2\u4EF6",
  author: "System",
  enabled: true,
  priority: 100,
  // 插件加载时调用
  onLoad: async (ctx) => {
    ctx.log("info", "\u793A\u4F8B\u63D2\u4EF6\u5DF2\u52A0\u8F7D");
  },
  // 插件卸载时调用
  onUnload: async () => {
    console.log("[example-plugin] \u63D2\u4EF6\u5DF2\u5378\u8F7D");
  },
  // 处理消息
  onMessage: async (event, ctx) => {
    if (event.isGroup) {
      ctx.log("info", `\u6536\u5230\u7FA4\u6D88\u606F [${event.groupId}]: ${event.message.text.slice(0, 50)}`);
    } else {
      ctx.log("info", `\u6536\u5230\u79C1\u804A\u6D88\u606F [${event.senderId}]: ${event.message.text.slice(0, 50)}`);
    }
    return false;
  },
  // 定义命令
  commands: [
    {
      name: "hello",
      aliases: ["\u4F60\u597D", "hi"],
      description: "\u6253\u62DB\u547C",
      usage: "/hello [\u540D\u5B57]",
      handler: async (args, event, ctx) => {
        const name = args[0] || "\u670B\u53CB";
        return `\u4F60\u597D\uFF0C${name}\uFF01\u6211\u662F\u673A\u5668\u4EBA\u52A9\u624B \u{1F60A}`;
      }
    },
    {
      name: "ping",
      description: "\u6D4B\u8BD5\u673A\u5668\u4EBA\u54CD\u5E94",
      handler: async (_args, _event, ctx) => {
        ctx.log("info", "\u6536\u5230 ping \u547D\u4EE4");
        return "pong! \u{1F3D3}";
      }
    },
    {
      name: "time",
      aliases: ["\u65F6\u95F4"],
      description: "\u83B7\u53D6\u5F53\u524D\u65F6\u95F4",
      handler: async () => {
        const now = /* @__PURE__ */ new Date();
        const timeStr = now.toLocaleString("zh-CN", {
          timeZone: "Asia/Shanghai",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        });
        return `\u5F53\u524D\u65F6\u95F4\uFF1A${timeStr}`;
      }
    },
    {
      name: "echo",
      description: "\u590D\u8BFB\u6D88\u606F",
      usage: "/echo <\u6D88\u606F\u5185\u5BB9>",
      handler: async (args, _event, ctx) => {
        if (args.length === 0) {
          return "\u8BF7\u8F93\u5165\u8981\u590D\u8BFB\u7684\u5185\u5BB9\uFF0C\u4F8B\u5982\uFF1A/echo \u4F60\u597D";
        }
        const content = args.join(" ");
        ctx.log("info", `\u590D\u8BFB\u6D88\u606F: ${content}`);
        return content;
      }
    }
  ]
};
var example_plugin_default = examplePlugin;
export {
  example_plugin_default as default
};
