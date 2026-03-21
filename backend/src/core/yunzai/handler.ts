/**
 * 云崽适配器 - Handler 事件处理器
 */

import { addSystemLog } from '../store.js';

/** Handler 事件存储 */
const handlerEvents: Record<string, Array<{
  priority: number;
  fn: Function;
  ns: string;
  self: any;
  key: string;
}>> = {};

/**
 * Handler 管理器
 */
export const Handler = {
  /**
   * 添加事件处理器
   */
  add(cfg: { ns: string; fn: Function; self?: any; priority?: number; key?: string; event?: string }): void {
    const key = cfg.key || cfg.event;
    if (!key || !cfg.fn) return;
    
    Handler.del(cfg.ns, key);
    addSystemLog('INFO', 'plugin', `[Handler][注册]: [${cfg.ns}][${key}]`);
    
    if (!handlerEvents[key]) handlerEvents[key] = [];
    handlerEvents[key].push({
      priority: cfg.priority ?? 500,
      fn: cfg.fn,
      ns: cfg.ns,
      self: cfg.self,
      key
    });
    
    handlerEvents[key].sort((a, b) => a.priority - b.priority);
  },
  
  /**
   * 删除事件处理器
   */
  del(ns: string, key?: string): void {
    if (!key) {
      for (const k in handlerEvents) {
        Handler.del(ns, k);
      }
      return;
    }
    
    if (!handlerEvents[key]) return;
    
    for (let i = handlerEvents[key].length - 1; i >= 0; i--) {
      if (handlerEvents[key][i].ns === ns) {
        handlerEvents[key].splice(i, 1);
      }
    }
    handlerEvents[key].sort((a, b) => a.priority - b.priority);
  },
  
  /**
   * 调用所有处理器
   */
  async callAll(key: string, e: any, args?: any): Promise<any> {
    return Handler.call(key, e, args, true);
  },
  
  /**
   * 调用处理器
   */
  async call(key: string, e: any, args?: any, allHandler: boolean = false): Promise<any> {
    if (!handlerEvents[key]) return undefined;
    
    let ret: any;
    for (const obj of handlerEvents[key]) {
      let done = true;
      const reject = (msg: string = '') => {
        if (msg) {
          addSystemLog('INFO', 'plugin', `[Handler][Reject]: [${obj.ns}][${key}] ${msg}`);
        }
        done = false;
      };
      
      ret = await obj.fn.call(obj.self, e, args, reject);
      if (done && !allHandler) {
        addSystemLog('INFO', 'plugin', `[Handler][Done]: [${obj.ns}][${key}]`);
        return ret;
      }
    }
    return ret;
  },
  
  /**
   * 检查处理器是否存在
   */
  has(key: string): boolean {
    return !!handlerEvents[key] && handlerEvents[key].length > 0;
  },
  
  /**
   * 获取指定key的所有处理器
   */
  get(key: string): Array<{ priority: number; fn: Function; ns: string; self: any; key: string }> {
    return handlerEvents[key] ? [...handlerEvents[key]] : [];
  },
  
  /**
   * 清空所有处理器
   */
  clear(): void {
    for (const key in handlerEvents) {
      delete handlerEvents[key];
    }
  }
};

/**
 * 创建运行时 handler 对象
 */
export function createRuntimeHandler() {
  return {
    has: Handler.has,
    call: (key: string, e: any, args?: any) => Handler.call(key, e, args),
    callAll: (key: string, e: any, args?: any) => Handler.callAll(key, e, args)
  };
}
