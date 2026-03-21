/**
 * 云崽适配器 - Segment 消息构建器
 * 模拟云崽的 segment API
 */

import { SegmentType } from './types.js';

/**
 * segment 消息构建器
 */
export const segment = {
  text: (text: string): SegmentType => ({ type: 'text', text }),
  
  image: (file: string, cache?: boolean, timeout?: number): SegmentType => ({ 
    type: 'image', 
    file,
    cache,
    timeout
  }),
  
  at: (qq: string | number, name?: string): SegmentType => ({ 
    type: 'at', 
    qq: String(qq),
    name 
  }),
  
  reply: (id: string | number): SegmentType => ({ 
    type: 'reply', 
    id: String(id) 
  }),
  
  face: (id: number): SegmentType => ({ type: 'face', id }),
  
  record: (file: string): SegmentType => ({ type: 'record', file }),
  
  video: (file: string): SegmentType => ({ type: 'video', file }),
  
  json: (data: string | object): SegmentType => ({ 
    type: 'json', 
    data: typeof data === 'string' ? data : JSON.stringify(data)
  }),
  
  xml: (data: string): SegmentType => ({ type: 'xml', data }),
  
  poke: (id: number): SegmentType => ({ type: 'poke', id }),
  
  forward: (id: string): SegmentType => ({ type: 'forward', id }),
  
  node: (data: any[]): SegmentType => ({ type: 'node', data }),
  
  raw: (data: any): SegmentType => ({ type: 'raw', data }),
  
  button: (data: any): SegmentType => ({ type: 'button', data }),
  
  markdown: (data: any): SegmentType => ({ type: 'markdown', data }),
  
  file: (file: string, name?: string): SegmentType => ({ type: 'file', file, name })
};

/**
 * 解析消息为消息段
 */
export function parseMessageToSegments(text: string): SegmentType[] {
  const segments: SegmentType[] = [];
  
  const atRegex = /<at\s+qq=["']?(\d+)["']?\s*(?:name=["']?([^"']+)["']?)?\s*\/?>/g;
  let lastIndex = 0;
  let match;
  
  while ((match = atRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', text: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'at', qq: match[1], name: match[2] });
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < text.length) {
    segments.push({ type: 'text', text: text.slice(lastIndex) });
  }
  
  return segments.length > 0 ? segments : [{ type: 'text', text }];
}

/**
 * 将消息段转换为文本
 */
export function segmentToText(message: string | SegmentType | SegmentType[]): string {
  if (typeof message === 'string') {
    return message;
  }
  
  if (Array.isArray(message)) {
    return message.map(seg => segmentToString(seg)).join('');
  }
  
  return segmentToString(message);
}

/**
 * 单个消息段转字符串
 */
export function segmentToString(seg: SegmentType): string {
  switch (seg.type) {
    case 'text':
      return seg.text;
    case 'image':
      return `[图片:${seg.file}]`;
    case 'at':
      return seg.name ? `@${seg.name}` : `@${seg.qq}`;
    case 'reply':
      return `[回复:${seg.id}]`;
    case 'face':
      return `[表情:${seg.id}]`;
    case 'record':
      return `[语音]`;
    case 'video':
      return `[视频]`;
    case 'json':
      return `[JSON消息]`;
    case 'xml':
      return `[XML消息]`;
    case 'poke':
      return `[戳一戳]`;
    case 'forward':
      return `[转发消息]`;
    case 'node':
      return `[合并转发]`;
    case 'raw':
      return `[原始消息]`;
    case 'button':
      return `[按钮]`;
    case 'markdown':
      return `[Markdown]`;
    case 'file':
      return `[文件:${seg.name || seg.file}]`;
    default:
      return '';
  }
}

/**
 * 将消息段转换为QQ官方API格式
 */
export function segmentToQQOfficial(seg: SegmentType): any {
  switch (seg.type) {
    case 'text':
      return { type: 'text', text: seg.text };
    case 'image':
      return { type: 'image', url: seg.url || seg.file };
    case 'at':
      if (seg.qq === 'all') {
        return { type: 'mention_all' };
      }
      return { type: 'mention_user', user_id: seg.qq };
    case 'reply':
      return { type: 'reply', message_id: seg.id };
    case 'face':
      return { type: 'face', id: String(seg.id) };
    case 'record':
    case 'video':
      return { type: seg.type, url: seg.file };
    case 'json':
      return { type: 'ark', ark: JSON.parse(seg.data) };
    case 'xml':
      return { type: 'ark', ark: { template_id: 0, kv: [{ key: '#DESC#', value: seg.data }] } };
    case 'markdown':
      return { type: 'markdown', ...seg.data };
    case 'button':
      return { type: 'keyboard', ...seg.data };
    default:
      return { type: 'text', text: segmentToString(seg) };
  }
}

/**
 * 将消息段数组转换为QQ官方API格式
 */
export function segmentsToQQOfficial(message: string | SegmentType | SegmentType[]): any[] {
  if (typeof message === 'string') {
    return [{ type: 'text', text: message }];
  }
  
  if (Array.isArray(message)) {
    return message.map(seg => segmentToQQOfficial(seg));
  }
  
  return [segmentToQQOfficial(message)];
}
