/**
 * QQ 机器人消息段 (Segment) API
 * 
 * 参考 qq-official-bot 的 icqq 风格设计，提供链式消息构建能力。
 * 同时兼容本项目的 yunzai segment 格式。
 * 
 * 消息段规则：
 * - 可重复组合: text, face, at, button
 * - 独立元素: image, video, audio, markdown, ark, embed
 * - 特殊元素: reply (必须作为第一个元素)
 */

import type {
  MarkdownPayload,
  ArkPayload,
  EmbedPayload,
  KeyboardPayload,
  SendMessageRequest,
} from './types.js';
import { MessageType } from './types.js';

// ==================== Segment 类型 ====================

export type SegmentType =
  | TextSegment
  | ImageSegment
  | AtSegment
  | ReplySegment
  | FaceSegment
  | MarkdownSegment
  | ArkSegment
  | EmbedSegment
  | KeyboardSegment
  | AudioSegment
  | VideoSegment
  | FileSegment;

export interface TextSegment {
  type: 'text';
  text: string;
}

export interface ImageSegment {
  type: 'image';
  /** URL 或 file_info 或本地文件路径 */
  file: string;
  /** 是否使用缓存 */
  cache?: boolean;
  /** 超时时间 */
  timeout?: number;
}

export interface AtSegment {
  type: 'at';
  /** @目标的 QQ 号或 openid */
  qq: string;
  /** @目标的昵称 */
  name?: string;
}

export interface ReplySegment {
  type: 'reply';
  /** 被回复的消息 ID */
  id: string;
}

export interface FaceSegment {
  type: 'face';
  id: number;
}

export interface MarkdownSegment {
  type: 'markdown';
  /** Markdown 内容或模板参数 */
  data: MarkdownPayload;
}

export interface ArkSegment {
  type: 'ark';
  /** Ark 模板数据 */
  data: ArkPayload;
}

export interface EmbedSegment {
  type: 'embed';
  /** Embed 数据 */
  data: EmbedPayload;
}

export interface KeyboardSegment {
  type: 'keyboard';
  /** 键盘按钮数据 */
  data: KeyboardPayload;
}

export interface AudioSegment {
  type: 'audio';
  file: string;
}

export interface VideoSegment {
  type: 'video';
  file: string;
}

export interface FileSegment {
  type: 'file';
  file: string;
  name?: string;
}

// ==================== Segment 构建器 ====================

/**
 * 静态 segment 工厂函数 (兼容 yunzai 风格)
 * 
 * 用法：
 *   segment.text("Hello")
 *   segment.at("123456")
 *   segment.image("https://...")
 */
export const segment = {
  text: (text: string): TextSegment => ({ type: 'text', text }),

  image: (file: string, cache?: boolean, timeout?: number): ImageSegment => ({
    type: 'image',
    file,
    cache,
    timeout,
  }),

  at: (qq: string | number, name?: string): AtSegment => ({
    type: 'at',
    qq: String(qq),
    name,
  }),

  reply: (id: string | number): ReplySegment => ({
    type: 'reply',
    id: String(id),
  }),

  face: (id: number): FaceSegment => ({ type: 'face', id }),

  markdown: (data: MarkdownPayload): MarkdownSegment => ({
    type: 'markdown',
    data,
  }),

  ark: (data: ArkPayload): ArkSegment => ({ type: 'ark', data }),

  embed: (data: EmbedPayload): EmbedSegment => ({ type: 'embed', data }),

  keyboard: (data: KeyboardPayload): KeyboardSegment => ({
    type: 'keyboard',
    data,
  }),

  audio: (file: string): AudioSegment => ({ type: 'audio', file }),

  video: (file: string): VideoSegment => ({ type: 'video', file }),

  file: (file: string, name?: string): FileSegment => ({
    type: 'file',
    file,
    name,
  }),
};

// ==================== MessageBuilder (链式 API) ====================

/**
 * 消息构建器 - icqq 风格链式 API
 * 
 * 用法：
 *   new MessageBuilder()
 *     .text("Hello ")
 *     .at("123456")
 *     .text("!")
 *     .build()
 * 
 *   new MessageBuilder()
 *     .reply("msg-id-123")
 *     .image("https://example.com/photo.jpg")
 *     .build()
 * 
 *   new MessageBuilder()
 *     .markdown({ custom_template_id: "tmpl_1", params: [...] })
 *     .keyboard({ rows: [...] })
 *     .build()
 */
export class MessageBuilder {
  private segments: SegmentType[] = [];
  private hasStandalone: boolean = false;
  private standaloneTypes = new Set<string>(['image', 'markdown', 'ark', 'embed', 'audio', 'video']);

  /** 添加文本 */
  text(content: string): this {
    this.validateNotStandalone('text');
    this.segments.push(segment.text(content));
    return this;
  }

  /** 添加 @ */
  at(qq: string | number, name?: string): this {
    this.validateNotStandalone('at');
    this.segments.push(segment.at(qq, name));
    return this;
  }

  /** 添加表情 */
  face(id: number): this {
    this.validateNotStandalone('face');
    this.segments.push(segment.face(id));
    return this;
  }

  /** 被回复消息 (必须在第一个) */
  reply(id: string | number): this {
    if (this.segments.length > 0) {
      throw new Error('reply 必须作为消息的第一个元素');
    }
    this.segments.push(segment.reply(id));
    return this;
  }

  /** 添加图片 (独立元素，只能一个) */
  image(file: string, cache?: boolean, timeout?: number): this {
    this.validateStandalone('image');
    this.segments.push(segment.image(file, cache, timeout));
    this.hasStandalone = true;
    return this;
  }

  /** 添加 Markdown (独立元素，只能一个) */
  markdown(data: MarkdownPayload): this {
    this.validateStandalone('markdown');
    this.segments.push(segment.markdown(data));
    this.hasStandalone = true;
    return this;
  }

  /** 添加 Ark 消息 (独立元素) */
  ark(data: ArkPayload): this {
    this.validateStandalone('ark');
    this.segments.push(segment.ark(data));
    this.hasStandalone = true;
    return this;
  }

  /** 添加 Embed 消息 (独立元素) */
  embed(data: EmbedPayload): this {
    this.validateStandalone('embed');
    this.segments.push(segment.embed(data));
    this.hasStandalone = true;
    return this;
  }

  /** 添加键盘 (可与文本/Markdown组合) */
  keyboard(data: KeyboardPayload): this {
    this.segments.push(segment.keyboard(data));
    return this;
  }

  /** 添加音频 (独立元素) */
  audio(file: string): this {
    this.validateStandalone('audio');
    this.segments.push(segment.audio(file));
    this.hasStandalone = true;
    return this;
  }

  /** 添加视频 (独立元素) */
  video(file: string): this {
    this.validateStandalone('video');
    this.segments.push(segment.video(file));
    this.hasStandalone = true;
    return this;
  }

  /** 添加文件 */
  file(file: string, name?: string): this {
    this.segments.push(segment.file(file, name));
    return this;
  }

  // ---- 内部校验 ----

  private validateNotStandalone(type: string): void {
    if (this.hasStandalone) {
      throw new Error(`${type} 不能与独立元素 (image/markdown/ark/embed/audio/video) 共存`);
    }
  }

  private validateStandalone(type: string): void {
    if (this.hasStandalone) {
      throw new Error(`每个消息只能包含一个独立元素，已存在独立元素`);
    }
    const hasOther = this.segments.some(
      (s) => s.type !== 'reply' && s.type !== type
    );
    if (hasOther) {
      throw new Error(`${type} 作为独立元素不能与 text/at/face 等组合元素共存`);
    }
  }

  // ==================== 构建输出 ====================

  /** 构建为 SendMessageRequest (用于 SDK 发送) */
  build(): SendMessageRequest {
    if (this.segments.length === 0) {
      throw new Error('消息不能为空');
    }

    const first = this.segments[0];
    const request: SendMessageRequest = { msg_type: MessageType.TEXT };

    // 处理独立元素
    if (first.type === 'image') {
      request.msg_type = MessageType.MEDIA;
      request.media = { file_info: first.file };
    } else if (first.type === 'markdown') {
      request.msg_type = MessageType.MARKDOWN;
      request.markdown = first.data;
    } else if (first.type === 'ark') {
      request.msg_type = MessageType.ARK;
      request.ark = first.data;
    } else if (first.type === 'embed') {
      request.msg_type = MessageType.EMBED;
      request.embed = first.data;
    } else if (first.type === 'audio' || first.type === 'video') {
      request.msg_type = MessageType.MEDIA;
      request.media = { file_info: first.file };
    } else {
      // 可组合元素：拼接文本
      request.content = this.buildTextContent();
      request.msg_type = MessageType.TEXT;
    }

    // 提取 reply
    if (first.type === 'reply') {
      request.msg_id = first.id;
      request.msg_seq = 1;
      // 移除 reply 后检查是否有真实内容
      if (this.segments.length > 1) {
        const contentSegments = this.segments.slice(1);
        // 重新处理内容部分
        if (contentSegments[0].type === 'image') {
          request.msg_type = MessageType.MEDIA;
          request.media = { file_info: contentSegments[0].file };
          request.content = undefined;
        } else {
          request.content = this.segmentsToText(contentSegments);
        }
      }
    }

    // 附加 keyboard
    const kbSegment = this.segments.find((s) => s.type === 'keyboard') as
      | KeyboardSegment
      | undefined;
    if (kbSegment) {
      request.keyboard = kbSegment.data;
    }

    return request;
  }

  /** 构建为纯文本字符串 */
  buildText(): string {
    return this.buildTextContent();
  }

  /** 获取所有 segments */
  getSegments(): SegmentType[] {
    return [...this.segments];
  }

  /** 构建文本内容 */
  private buildTextContent(): string {
    return this.segmentsToText(this.segments);
  }

  private segmentsToText(segs: SegmentType[]): string {
    return segs
      .filter(
        (s): s is TextSegment | AtSegment | FaceSegment =>
          s.type === 'text' || s.type === 'at' || s.type === 'face'
      )
      .map((s) => {
        if (s.type === 'text') return s.text;
        if (s.type === 'at') return s.name ? `@${s.name}` : `@${s.qq}`;
        if (s.type === 'face') return `[表情:${s.id}]`;
        return '';
      })
      .join('');
  }

  // ==================== 工厂方法 ====================

  /** 从纯文本创建 */
  static fromText(text: string): MessageBuilder {
    return new MessageBuilder().text(text);
  }

  /** 从 segments 数组创建 */
  static fromSegments(segments: SegmentType[]): MessageBuilder {
    const builder = new MessageBuilder();
    builder.segments = [...segments];
    return builder;
  }

  /** 从 yunzai 风格 message 创建 (兼容旧代码) */
  static fromYunzaiMessage(message: string | SegmentType | SegmentType[]): MessageBuilder {
    const builder = new MessageBuilder();
    if (typeof message === 'string') {
      builder.segments.push(segment.text(message));
    } else if (Array.isArray(message)) {
      builder.segments = [...message];
    } else {
      builder.segments = [message];
    }
    return builder;
  }
}
