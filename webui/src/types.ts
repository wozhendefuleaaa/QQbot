export type AccountStatus = 'DISABLED' | 'CONNECTING' | 'ONLINE' | 'OFFLINE';
export type MenuKey =
  | 'home'
  | 'accounts'
  | 'chat'
  | 'platform'
  | 'config'
  | 'logs'
  | 'statistics'
  | 'openapi'
  | 'plugins';
export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export type BotAccount = {
  id: string;
  name: string;
  appId: string;
  appSecretMasked: string;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
};

export type Conversation = {
  id: string;
  accountId: string;
  peerId: string;
  peerType: 'user' | 'group';
  peerName: string;
  lastMessage: string;
  updatedAt: string;
  // 扩展字段
  unreadCount?: number;
  isPinned?: boolean;
  tags?: string[];
  remark?: string;
  avatar?: string;
};

export type MessageStatus = 'pending' | 'sent' | 'failed';

export type ChatMessage = {
  id: string;
  accountId: string;
  conversationId: string;
  direction: 'in' | 'out';
  text: string;
  createdAt: string;
  // 扩展字段
  status?: MessageStatus;
  replyTo?: string;
  mentionedUsers?: string[];
};

export type QuickReply = {
  id: string;
  category: string;
  text: string;
  shortcut?: string;
  createdAt: string;
};

export type PlatformStatus = {
  connected: boolean;
  connecting: boolean;
  connectedAccountId: string | null;
  connectedAccountName: string | null;
  lastConnectedAt: string | null;
  tokenExpiresAt: string | null;
  lastError: string | null;
};

export type PlatformLog = {
  id: string;
  level: LogLevel;
  message: string;
  createdAt: string;
};

// 插件权限矩阵 - 按机器人账号存储
export type PluginPermissionMatrix = {
  accountId: string;                    // 机器人账号ID
  groups: string[];                     // 群组ID列表 (包含 'private' 表示私聊)
  disabledPlugins: Record<string, string[]>;  // key: groupId, value: 禁用的插件ID列表
};

// 云崽权限配置
export type YunzaiPermissionConfig = {
  masterIds: string[];   // 主人ID列表
  adminIds: string[];    // 管理员ID列表
};

export type AppConfig = {
  webName: string;
  notice: string;
  allowOpenApi: boolean;
  defaultIntent: number;
  // 插件权限矩阵配置 - 按机器人账号索引
  pluginPermissions: Record<string, PluginPermissionMatrix>;  // key: accountId
  // 云崽权限配置
  yunzaiPermission?: YunzaiPermissionConfig;
  updatedAt: string;
};

export type PluginInfo = {
  id: string;
  name: string;
  enabled: boolean;
  version: string;
  description: string;
  author?: string;
  priority?: number;
  commands?: Array<{
    name: string;
    description: string;
    usage?: string;
    permission?: string;
  }>;
  hasOnMessage?: boolean;
  hasCronJobs?: boolean;
  loaded?: boolean;
  updatedAt: string;
};

export type PluginConfig = {
  commandPrefix: string;
  allowGroup: boolean;
  allowPrivate: boolean;
  adminUserIds: string[];
  ownerIds?: string[];
};

export type PluginCommand = {
  plugin: string;
  name: string;
  description: string;
  usage?: string;
  permission?: string;
};

export type SystemLog = {
  id: string;
  level: LogLevel;
  category: 'framework' | 'plugin' | 'openapi' | 'config';
  message: string;
  createdAt: string;
};

export type StatisticsSnapshot = {
  date: string;
  activeAccounts: number;
  totalAccounts: number;
  conversations: number;
  privateConversations: number;
  groupConversations: number;
  inboundMessages: number;
  outboundMessages: number;
  platformConnected: boolean;
  platformUptime: number;
  quickReplies: number;
  plugins: number;
  topGroups: Array<{ id: string; name: string; messageCount: number }>;
  topUsers: Array<{ id: string; name: string; messageCount: number }>;
};

export type OpenApiTokenView = {
  id: string;
  name: string;
  tokenMasked: string;
  enabled: boolean;
  createdAt: string;
};

// 认证相关类型
export type User = {
  id: string;
  username: string;
  role: 'admin' | 'user';
  createdAt: string;
  lastLoginAt: string | null;
  /** 是否需要强制修改密码 */
  requirePasswordChange?: boolean;
};

export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse = {
  success: boolean;
  message: string;
  token: string;
  user: User;
};

export type AuthStatus = {
  authenticated: boolean;
  user: User | null;
};
