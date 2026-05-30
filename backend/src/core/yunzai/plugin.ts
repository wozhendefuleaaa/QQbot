/**
 * 云崽适配器 - 插件基类
 */

import { YunzaiEvent, YunzaiRule, YunzaiTask, YunzaiHandlerDef, ReplyOptions } from './types.js';

/** 上下文状态存储 */
const stateArr: Record<string, Record<string, any>> = {};

const SymbolTimeout = Symbol("Timeout");
const SymbolResolve = Symbol("Resolve");

/**
 * 云崽插件基类
 */
export class YunzaiPlugin {
  name: string = '';
  dsc: string = '';
  event: string = 'message';
  priority: number = 5000;
  rule: YunzaiRule[] = [];
  task?: YunzaiTask | YunzaiTask[];
  handler?: YunzaiHandlerDef[];
  namespace?: string;
  enable: boolean = true;
  
  e!: YunzaiEvent;
  self_id?: string;
  group_id?: string;
  user_id?: string;
  
  constructor(options?: {
    name?: string;
    dsc?: string;
    event?: string;
    priority?: number;
    rule?: YunzaiRule[];
    task?: YunzaiTask | YunzaiTask[];
    handler?: YunzaiHandlerDef[];
    namespace?: string;
  }) {
    if (options) {
      this.name = options.name || '';
      this.dsc = options.dsc || '';
      this.event = options.event || 'message';
      this.priority = options.priority ?? 5000;
      this.rule = options.rule || [];
      this.task = options.task;
      this.handler = options.handler;
      this.namespace = options.namespace;
    }
  }
  
  /**
   * 回复消息
   */
  reply(msg: any = '', quote: boolean = false, data: ReplyOptions = {}): Promise<any> {
    if (!this.e?.reply || !msg) return Promise.resolve(false);
    return this.e.reply(msg, quote, data);
  }
  
  /**
   * 获取上下文key
   */
  conKey(isGroup: boolean = false): string {
    const selfId = this.self_id || this.e?.self_id || '';
    const groupId = this.group_id || this.e?.group_id || '';
    const userId = this.user_id || this.e?.user_id || '';
    
    if (isGroup && groupId) {
      return `${this.name}.${selfId}.${groupId}`;
    }
    return `${this.name}.${selfId}.${userId}`;
  }
  
  /**
   * 设置上下文
   */
  setContext(type: string, isGroup: boolean = false, time: number = 120, timeout: string = '操作超时已取消'): any {
    const key = this.conKey(isGroup);
    if (!stateArr[key]) stateArr[key] = {};
    
    stateArr[key][type] = this.e;
    
    if (time) {
      const contextEntry = stateArr[key][type];
      trackContextTimer(contextEntry, time);
      stateArr[key][type][SymbolTimeout] = setTimeout(() => {
        const resolve = stateArr[key][type]?.[SymbolResolve];
        timerExpiryMap.delete(stateArr[key][type]);
        delete stateArr[key][type];
        if (resolve) {
          resolve(false);
        } else {
          this.reply(timeout, true);
        }
      }, time * 1000);
    }
    
    return stateArr[key][type];
  }
  
  /**
   * 获取上下文
   */
  getContext(type?: string, isGroup: boolean = false): any {
    const key = this.conKey(isGroup);
    if (type) return stateArr[key]?.[type];
    return stateArr[key];
  }
  
  /**
   * 完成上下文
   */
  finish(type: string, isGroup: boolean = false): void {
    const key = this.conKey(isGroup);
    if (stateArr[key]?.[type]) {
      clearTimeout(stateArr[key][type][SymbolTimeout]);
      delete stateArr[key][type];
    }
  }
  
  /**
   * 等待上下文
   */
  awaitContext(...args: any[]): Promise<any> {
    return new Promise(resolve => {
      const context = this.setContext('resolveContext', ...args);
      context[SymbolResolve] = resolve;
    });
  }
  
  /**
   * 解析上下文
   */
  resolveContext(context: any): void {
    this.finish('resolveContext');
    context[SymbolResolve](this.e);
  }
  
  /**
   * 渲染图片
   */
  async renderImg(plugin: string, tpl: string, data: any, cfg: any): Promise<any> {
    if (this.e?.runtime?.render) {
      return this.e.runtime.render(plugin, tpl, data, { ...cfg, e: this.e });
    }
    return false;
  }
}

/**
 * 获取上下文状态存储（用于外部访问）
 */
export function getStateArr(): Record<string, Record<string, any>> {
  return stateArr;
}

/**
 * 过期跟踪：为每个 context 存储其过期时间戳
 */
const timerExpiryMap = new Map<any, number>();

/**
 * 清理过期的上下文
 * 使用独立存储的过期时间而非依赖 Node 内部 Timer 属性
 */
export function clearExpiredContexts(): void {
  const now = Date.now();
  for (const key in stateArr) {
    for (const type in stateArr[key]) {
      const entry = stateArr[key][type];
      const expiry = timerExpiryMap.get(entry);
      if (expiry !== undefined && now >= expiry) {
        clearTimeout(entry[SymbolTimeout]);
        timerExpiryMap.delete(entry);
        delete stateArr[key][type];
      }
    }
  }
}

/**
 * 记录 context 超时时间（在 setContext 中调用）
 * @internal 供 setContext 内部使用
 */
export function trackContextTimer(contextEntry: any, timeoutMs: number): void {
  if (timeoutMs > 0) {
    timerExpiryMap.set(contextEntry, Date.now() + timeoutMs * 1000);
  }
}
