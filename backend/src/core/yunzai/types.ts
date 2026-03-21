/**
 * 云崽适配器 - 类型定义
 */

import { MessageEvent } from '../plugin-types.js';

// ==================== 配置类型 ====================

export interface YunzaiConfig {
  master: Record<string, string[]>;
  masterQQ: string[];
  adminQQ: string[];
  group: Record<string, any>;
  other: Record<string, any>;
}

export interface YunzaiPermissionConfig {
  masterIds: string[];
  adminIds: string[];
}

// ==================== 消息段类型 ====================

export type SegmentType = 
  | { type: 'text'; text: string }
  | { type: 'image'; file: string; url?: string; cache?: boolean; timeout?: number }
  | { type: 'at'; qq: string; name?: string }
  | { type: 'reply'; id: string }
  | { type: 'face'; id: number }
  | { type: 'record'; file: string }
  | { type: 'video'; file: string }
  | { type: 'json'; data: string }
  | { type: 'xml'; data: string }
  | { type: 'poke'; id: number }
  | { type: 'forward'; id: string }
  | { type: 'node'; data: any[] }
  | { type: 'raw'; data: any }
  | { type: 'button'; data: any }
  | { type: 'markdown'; data: any }
  | { type: 'file'; file: string; name?: string };

// ==================== 回复选项 ====================

export interface ReplyOptions {
  recallMsg?: number;
  at?: boolean;
}

// ==================== 群/好友/成员对象 ====================

export interface YunzaiGroup {
  group_id: string;
  group_name: string;
  member_count?: number;
  max_member_count?: number;
  guild_id?: string;
  sendMsg: (message: string | SegmentType | SegmentType[]) => Promise<any>;
  recallMsg?: (messageId: string) => Promise<void>;
  makeForwardMsg?: (messages: any[]) => Promise<any>;
  pickMember: (userId: string) => YunzaiMember;
  muteMember?: (userId: string, duration: number) => Promise<void>;
  kickMember?: (userId: string) => Promise<void>;
}

export interface YunzaiFriend {
  user_id: string;
  nickname: string;
  sendMsg: (message: string | SegmentType | SegmentType[]) => Promise<any>;
  makeForwardMsg?: (messages: any[]) => Promise<any>;
}

export interface YunzaiMember {
  user_id: string;
  nickname: string;
  card?: string;
  role?: 'owner' | 'admin' | 'member';
  mute?: (duration: number) => Promise<void>;
  kick?: () => Promise<void>;
  info?: any;
}

// ==================== 运行时对象 ====================

export interface YunzaiRuntime {
  cfg: any;
  handler: {
    has: (key: string) => boolean;
    call: (key: string, e: any, args?: any) => Promise<any>;
    callAll: (key: string, e: any, args?: any) => Promise<any>;
  };
  render: (plugin: string, path: string, data?: any, cfg?: any) => Promise<string | boolean | null>;
  initUser: () => Promise<void>;
  uid?: string;
  hasCk?: boolean;
  user?: any;
  common?: any;
  puppeteer?: any;
  MysInfo?: any;
  NoteUser?: any;
  MysUser?: any;
  gsCfg?: any;
}

// ==================== 事件对象 ====================

export interface YunzaiEvent {
  message_id: string;
  raw_message: string;
  msg: string;
  message: string | SegmentType[];
  segments?: SegmentType[];
  user_id: string;
  sender: {
    user_id: string;
    nickname: string;
    card?: string;
    sex?: string;
    age?: number;
    area?: string;
    level?: string;
    role?: 'owner' | 'admin' | 'member';
  };
  group_id?: string;
  group_name?: string;
  group?: YunzaiGroup;
  friend?: YunzaiFriend;
  member?: YunzaiMember;
  isGroup: boolean;
  isPrivate: boolean;
  atBot?: boolean;
  atUser?: string[];
  hasAlias?: boolean;
  self_id?: string;
  isMaster?: boolean;
  runtime?: YunzaiRuntime;
  user?: any;
  game?: string;
  originalEvent?: MessageEvent;
  reply: (message: string | SegmentType | SegmentType[], quote?: boolean, data?: ReplyOptions) => Promise<any>;
  replyMsg: (message: string | SegmentType | SegmentType[]) => Promise<any>;
  getAtUser: () => string[];
  hasAt: () => boolean;
  isAt: (userId: string) => boolean;
  // 扩展属性
  message_type?: 'private' | 'group' | 'guild';
  sub_type?: string;
  post_type?: string;
  time?: number;
  guild_id?: string;
  channel_id?: string;
  at?: boolean;
  log?: {
    info: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
    debug: (...args: any[]) => void;
  };
  recall?: () => Promise<void>;
  getGroupMemberList?: () => Promise<any[]>;
  getGroupMemberInfo?: (userId: string) => Promise<any>;
  setGroupCard?: (card: string) => Promise<void>;
  setGroupSpecialTitle?: (title: string) => Promise<void>;
  setGroupBan?: (duration: number) => Promise<void>;
  setGroupWholeBan?: (enable: boolean) => Promise<void>;
  setGroupKick?: (userId?: string) => Promise<void>;
  setGroupLeave?: () => Promise<void>;
  sendGroupNotice?: (content: string) => Promise<void>;
  getGroupNotice?: () => Promise<any[]>;
  setFriendAddRequest?: (flag: string, approve?: boolean, remark?: string) => Promise<void>;
  setGroupAddRequest?: (flag: string, subType?: string, approve?: boolean, reason?: string) => Promise<void>;
  getFriendList?: () => Promise<any[]>;
  getGroupList?: () => Promise<any[]>;
  getGroupInfo?: () => Promise<YunzaiGroup | null>;
  getAvatarUrl?: (userId?: string, size?: number) => string;
  getGroupAvatarUrl?: (groupId?: string, size?: number) => string;
  isAdmin?: () => boolean;
  isOwner?: () => boolean;
  isGroupAdmin?: () => boolean;
  isGuild?: () => boolean;
}

// ==================== 插件规则/任务/Handler ====================

export interface YunzaiRule {
  reg?: string | RegExp;
  atBot?: boolean;
  prefix?: boolean | string[];
  fnc: string;
  permission?: 'master' | 'admin' | 'all';
  describe?: string;
  log?: boolean;
  event?: string;
}

export interface YunzaiTask {
  cron?: string;
  name: string;
  fnc: string;
  enable?: boolean;
  log?: boolean;
}

export interface YunzaiHandlerDef {
  key: string;
  fn: string;
  priority?: number;
}

// ==================== Bot 对象 ====================

export interface YunzaiBot {
  uin: string;
  nickname: string;
  avatar?: string;
  online_status?: number;
  version?: {
    id: string;
    name: string;
    version: string;
  };
  bots: Record<string, YunzaiBot>;
  adapter: any[];
  stat: { start_time: number; online: number };
  
  sendPrivateMsg: (userId: string, message: string | SegmentType | SegmentType[]) => Promise<{ message_id: string }>;
  sendGroupMsg: (groupId: string, message: string | SegmentType | SegmentType[]) => Promise<{ message_id: string }>;
  sendMsg: (targetId: string, message: string | SegmentType | SegmentType[], isGroup: boolean) => Promise<{ message_id: string }>;
  getGroupList: () => Promise<any[]>;
  getGroupInfo: (groupId: string) => Promise<any>;
  getGroupMemberList: (groupId: string) => Promise<any[]>;
  getGroupMemberInfo: (groupId: string, userId: string) => Promise<any>;
  getFriendList: () => Promise<any[]>;
  deleteMsg: (messageId: string) => Promise<void>;
  getMsg?: (messageId: string) => Promise<any>;
  setGroupBan: (groupId: string, userId: string, duration: number) => Promise<void>;
  setGroupWholeBan?: (groupId: string, enable: boolean) => Promise<void>;
  setGroupKick: (groupId: string, userId: string) => Promise<void>;
  pickFriend: (userId: string) => YunzaiFriend;
  pickGroup: (groupId: string) => YunzaiGroup;
  pickMember: (groupId: string, userId: string) => YunzaiMember;
  pickUser?: (userId: string) => YunzaiFriend;
  getAvatarUrl?: (size?: number) => string;
  getGroupAvatarUrl?: (groupId: string, size?: number) => string;
  getUserAvatarUrl?: (userId: string, size?: number) => string;
  isOnline?: () => boolean;
  logout?: () => Promise<void>;
  setOnlineStatus?: (status: number) => Promise<void>;
  makeLog?: (level: string, msg: any, id?: string | boolean, force?: boolean) => void;
  makeForwardMsg: (messages: any[]) => { type: string; data: any[] };
  makeForwardArray: (msg: any[], node?: any) => { type: string; data: any[] };
  sleep: (ms: number, promise?: Promise<any>) => Promise<any>;
  String: (data: any) => string;
  Buffer: (data: any, opts?: any) => Promise<Buffer>;
  download: (url: string, file?: string, opts?: any) => Promise<any>;
  mkdir: (dir: string) => Promise<boolean>;
  rm: (file: string) => Promise<boolean>;
  fsStat: (path: string, opts?: any) => Promise<any>;
  exec: (cmd: string | string[], opts?: any) => Promise<any>;
  on: (event: string, listener: (...args: any[]) => void) => void;
  once: (event: string, listener: (...args: any[]) => void) => void;
  emit: (event: string, ...args: any[]) => boolean;
  off: (event: string, listener: (...args: any[]) => void) => void;
  em: (event: string, data: any) => void;
}
