import { StatisticsSnapshot } from '../types.js';
import { conversations, messages } from './storage/chat.js';
import { accounts } from './storage/accounts.js';
import { quickReplies } from './storage/quick-replies.js';
import { plugins } from './storage/plugins.js';
import { platformStatus } from './platform-status.js';

export function buildStatisticsSnapshot(): StatisticsSnapshot {
  const today = new Date().toISOString().slice(0, 10);
  const inboundMessages = messages.filter((m) => m.direction === 'in').length;
  const outboundMessages = messages.filter((m) => m.direction === 'out').length;
  
  // 计算会话类型分布
  const privateConvs = conversations.filter((c) => c.peerType === 'user').length;
  const groupConvs = conversations.filter((c) => c.peerType === 'group').length;
  
  // 计算平台运行时间（秒）
  const platformUptime = platformStatus.connected && platformStatus.lastConnectedAt
    ? Math.floor((Date.now() - new Date(platformStatus.lastConnectedAt).getTime()) / 1000)
    : 0;
  
  // 计算活跃群组和用户（按消息数量排序）
  const groupMessageCounts = new Map<string, number>();
  const userMessageCounts = new Map<string, number>();
  
  for (const msg of messages) {
    if (msg.direction === 'in') {
      const conv = conversations.find((c) => c.id === msg.conversationId);
      if (conv) {
        if (conv.peerType === 'group') {
          const count = groupMessageCounts.get(conv.id) || 0;
          groupMessageCounts.set(conv.id, count + 1);
        } else {
          const count = userMessageCounts.get(conv.id) || 0;
          userMessageCounts.set(conv.id, count + 1);
        }
      }
    }
  }
  
  // 获取 Top 5 群组
  const topGroups = Array.from(groupMessageCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, messageCount]) => {
      const conv = conversations.find((c) => c.id === id);
      return { id, name: conv?.peerName || id, messageCount };
    });
  
  // 获取 Top 5 用户
  const topUsers = Array.from(userMessageCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, messageCount]) => {
      const conv = conversations.find((c) => c.id === id);
      return { id, name: conv?.peerName || id, messageCount };
    });

  return {
    date: today,
    activeAccounts: accounts.filter((a) => a.status === 'ONLINE').length,
    totalAccounts: accounts.length,
    conversations: conversations.length,
    privateConversations: privateConvs,
    groupConversations: groupConvs,
    inboundMessages,
    outboundMessages,
    platformConnected: platformStatus.connected,
    platformUptime,
    quickReplies: quickReplies.length,
    plugins: plugins.length,
    topGroups,
    topUsers
  };
}
