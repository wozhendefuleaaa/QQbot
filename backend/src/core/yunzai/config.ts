/**
 * 云崽适配器 - 配置管理
 */

import { appConfig } from '../store.js';
import { YunzaiConfig, YunzaiPermissionConfig } from './types.js';

/** 配置存储 */
let yunzaiConfig: YunzaiConfig = {
  master: {},
  masterQQ: [],
  adminQQ: [],
  group: {},
  other: {}
};

let permissionConfig: YunzaiPermissionConfig = {
  masterIds: [],
  adminIds: []
};

/**
 * 配置管理器 - 模拟云崽的 cfg
 */
export const cfg = {
  /** 获取群配置 */
  getGroup(bot_id: string = '', group_id: string = ''): Record<string, any> {
    const defaultConfig = {
      botAlias: [],
      onlyReplyAt: 0,
      groupCD: 0,
      singleCD: 0,
      enable: [],
      disable: []
    };
    
    const groupKey = group_id ? `${bot_id}:${group_id}` : '';
    const botDefaultKey = bot_id ? `${bot_id}:default` : '';
    
    return {
      ...defaultConfig,
      ...(yunzaiConfig.group['default'] || {}),
      ...(yunzaiConfig.group[botDefaultKey] || {}),
      ...(yunzaiConfig.group[group_id] || {}),
      ...(yunzaiConfig.group[groupKey] || {})
    };
  },
  
  /** 获取其他配置 */
  getOther(): Record<string, any> {
    return {
      masterQQ: yunzaiConfig.masterQQ,
      adminQQ: yunzaiConfig.adminQQ,
      blackUser: [],
      whiteUser: [],
      blackGroup: [],
      whiteGroup: [],
      ...yunzaiConfig.other
    };
  },
  
  /** 获取主人账号映射 */
  get master(): Record<string, string[]> {
    return yunzaiConfig.master;
  },
  
  /** 获取主人QQ列表 */
  get masterQQ(): string[] {
    return yunzaiConfig.masterQQ;
  },
  
  /** 获取机器人账号列表 */
  get uin(): string[] {
    return Object.keys(yunzaiConfig.master);
  },
  
  /** 获取默认配置 */
  getdefSet(_name: string): Record<string, any> {
    return {};
  },
  
  /** 获取用户配置 */
  getConfig(name: string): Record<string, any> {
    return yunzaiConfig[name as keyof YunzaiConfig] || {};
  },
  
  /** 获取所有配置 */
  getAllCfg(name: string): Record<string, any> {
    return {
      ...this.getdefSet(name),
      ...this.getConfig(name)
    };
  }
};

/**
 * 设置云崽配置
 */
export function setYunzaiConfig(config: Partial<YunzaiConfig>): void {
  yunzaiConfig = { ...yunzaiConfig, ...config };
}

/**
 * 获取云崽配置
 */
export function getYunzaiConfig(): YunzaiConfig {
  return { ...yunzaiConfig };
}

/**
 * 初始化配置（从环境变量或appConfig）
 */
export function initYunzaiConfig(): void {
  const masterEnv = process.env.YUNZAI_MASTER || process.env.MASTER || '';
  const masterQQEnv = process.env.YUNZAI_MASTER_QQ || process.env.MASTER_QQ || '';
  const adminQQEnv = process.env.YUNZAI_ADMIN_QQ || process.env.ADMIN_QQ || '';
  
  const master: Record<string, string[]> = {};
  if (masterEnv) {
    masterEnv.split(',').forEach(item => {
      const [botId, userId] = item.split(':');
      if (botId && userId) {
        if (!master[botId]) master[botId] = [];
        master[botId].push(userId);
      }
    });
  }
  
  yunzaiConfig = {
    master,
    masterQQ: masterQQEnv ? masterQQEnv.split(',').map(id => id.trim()).filter(Boolean) : [],
    adminQQ: adminQQEnv ? adminQQEnv.split(',').map(id => id.trim()).filter(Boolean) : [],
    group: {},
    other: {}
  };
  
  if (appConfig.yunzaiPermission) {
    if (appConfig.yunzaiPermission.masterIds) {
      yunzaiConfig.masterQQ = appConfig.yunzaiPermission.masterIds;
    }
    if (appConfig.yunzaiPermission.adminIds) {
      yunzaiConfig.adminQQ = appConfig.yunzaiPermission.adminIds;
    }
  }
}

// ==================== 权限管理 ====================

export function setPermissionConfig(config: Partial<YunzaiPermissionConfig>): void {
  if (config.masterIds) {
    permissionConfig.masterIds = config.masterIds;
  }
  if (config.adminIds) {
    permissionConfig.adminIds = config.adminIds;
  }
}

export function getPermissionConfig(): YunzaiPermissionConfig {
  return { ...permissionConfig };
}

export function addMaster(userId: string): void {
  if (!permissionConfig.masterIds.includes(userId)) {
    permissionConfig.masterIds.push(userId);
  }
}

export function removeMaster(userId: string): void {
  permissionConfig.masterIds = permissionConfig.masterIds.filter(id => id !== userId);
}

export function addAdmin(userId: string): void {
  if (!permissionConfig.adminIds.includes(userId)) {
    permissionConfig.adminIds.push(userId);
  }
}

export function removeAdmin(userId: string): void {
  permissionConfig.adminIds = permissionConfig.adminIds.filter(id => id !== userId);
}

export function isMaster(userId: string): boolean {
  return permissionConfig.masterIds.includes(userId) ||
         yunzaiConfig.masterQQ.includes(userId);
}

export function isAdmin(userId: string): boolean {
  return isMaster(userId) ||
         permissionConfig.adminIds.includes(userId) ||
         yunzaiConfig.adminQQ.includes(userId);
}
