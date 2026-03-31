/**
 * 音乐播放插件
 * 点歌、播放音乐，支持 QQ音乐、网易云音乐
 */

module.exports = {
  id: 'music-player',
  name: '音乐播放',
  version: '2.0.0',
  author: 'music-fan',
  description: '点歌、播放音乐，支持 QQ音乐、网易云音乐',

  // 默认配置
  config: {
    defaultSource: 'qq', // qq | netease
    maxResults: 5
  },

  // 模拟歌曲数据库
  mockSongs: [
    { id: 1, name: '晴天', artist: '周杰伦', album: '叶惠美', source: 'qq' },
    { id: 2, name: '七里香', artist: '周杰伦', album: '七里香', source: 'qq' },
    { id: 3, name: '稻香', artist: '周杰伦', album: '魔杰座', source: 'qq' },
    { id: 4, name: '起风了', artist: '买辣椒也用券', album: '起风了', source: 'netease' },
    { id: 5, name: '平凡之路', artist: '朴树', album: '猎户星座', source: 'netease' },
    { id: 6, name: '光年之外', artist: '邓紫棋', album: '光年之外', source: 'qq' },
    { id: 7, name: '告白气球', artist: '周杰伦', album: '周杰伦的床边故事', source: 'qq' },
    { id: 8, name: '海阔天空', artist: 'Beyond', album: '乐与怒', source: 'netease' }
  ],

  // 命令定义
  commands: [
    {
      name: '点歌',
      pattern: /^#点歌\s*(.*)$/,
      description: '搜索并点歌',
      handler: async (args, event, ctx) => {
        const keyword = args[0]?.trim();
        if (!keyword) {
          return ctx.sendMessage(event.sender.id, 'user', '请输入歌曲名称，例如：#点歌 晴天');
        }

        const results = module.exports.searchSongs(keyword);
        if (results.length === 0) {
          return ctx.sendMessage(event.sender.id, 'user', `未找到与 "${keyword}" 相关的歌曲`);
        }

        const song = results[0];
        const message = `🎵 ${song.name}\n👤 ${song.artist}\n💿 ${song.album}\n来源: ${song.source === 'qq' ? 'QQ音乐' : '网易云音乐'}`;
        return ctx.sendMessage(event.sender.id, 'user', message);
      }
    },
    {
      name: '热歌',
      pattern: /^#热歌$/,
      description: '获取热门歌曲榜单',
      handler: async (args, event, ctx) => {
        const hotSongs = module.exports.mockSongs.slice(0, 5);
        let message = '🔥 热门歌曲榜单\n\n';
        hotSongs.forEach((song, index) => {
          message += `${index + 1}. ${song.name} - ${song.artist}\n`;
        });
        return ctx.sendMessage(event.sender.id, 'user', message);
      }
    },
    {
      name: '搜歌',
      pattern: /^#搜歌\s*(.*)$/,
      description: '搜索歌曲',
      handler: async (args, event, ctx) => {
        const keyword = args[0]?.trim();
        if (!keyword) {
          return ctx.sendMessage(event.sender.id, 'user', '请输入搜索关键词，例如：#搜歌 周杰伦');
        }

        const results = module.exports.searchSongs(keyword);
        if (results.length === 0) {
          return ctx.sendMessage(event.sender.id, 'user', `未找到与 "${keyword}" 相关的歌曲`);
        }

        let message = `🔍 搜索结果 "${keyword}"\n\n`;
        results.slice(0, module.exports.config.maxResults).forEach((song, index) => {
          message += `${index + 1}. ${song.name} - ${song.artist}\n`;
          message += `   💿 ${song.album} | ${song.source === 'qq' ? 'QQ音乐' : '网易云'}\n`;
        });
        return ctx.sendMessage(event.sender.id, 'user', message);
      }
    }
  ],

  // 搜索歌曲
  searchSongs(keyword) {
    const lowerKeyword = keyword.toLowerCase();
    return this.mockSongs.filter(song => 
      song.name.toLowerCase().includes(lowerKeyword) ||
      song.artist.toLowerCase().includes(lowerKeyword) ||
      song.album.toLowerCase().includes(lowerKeyword)
    );
  },

  // 插件加载
  onLoad: async () => {
    console.log('[music-player] 音乐播放插件已加载');
  },

  // 插件卸载
  onUnload: async () => {
    console.log('[music-player] 音乐播放插件已卸载');
  }
};
