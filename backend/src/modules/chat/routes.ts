import { Express } from 'express';
import { Message } from '../../types.js';
import {
  accounts,
  conversations,
  id,
  messages,
  nowIso,
  platformStatus,
  scheduleSaveChatDataToDisk,
  setPlatformError
} from '../../core/store.js';
import { ensureAccountTransportReady, recallPlatformMessage, sendPlatformImageMessage, sendTextMessage, uploadPlatformImage } from '../platform/unified-sender.js';

export function registerChatRoutes(app: Express) {
  app.get('/api/chat/conversations', (req, res) => {
    const accountId = req.query.accountId as string | undefined;
    if (!accountId) {
      res.status(400).json({ error: 'accountId 为必填项' });
      return;
    }

    const items = conversations
      .filter((c) => c.accountId === accountId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    res.json({ items });
  });

  app.get('/api/chat/conversations/:id/messages', (req, res) => {
    const { before, limit = '50' } = req.query as { before?: string; limit?: string };
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);

    let items = messages
      .filter((m) => m.conversationId === req.params.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // 降序，最新的在前

    // 如果提供了before参数，只获取比该时间戳更早的消息
    if (before) {
      items = items.filter((m) => m.createdAt < before);
    }

    // 限制返回数量
    const hasMore = items.length > limitNum;
    items = items.slice(0, limitNum);

    // 返回升序排列（用于前端显示）
    items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    res.json({ items, hasMore });
  });

  app.post('/api/chat/messages/send', async (req, res) => {
    const { accountId, targetId, text, targetType } = req.body as {
      accountId?: string;
      targetId?: string;
      text?: string;
      targetType?: 'user' | 'group';
    };

    if (!accountId || !targetId || !text) {
      res.status(400).json({ error: 'accountId/targetId/text 为必填项' });
      return;
    }

    const resolvedTargetType = targetType === 'group' ? 'group' : 'user';

    if (targetType && targetType !== 'user' && targetType !== 'group') {
      res.status(400).json({ error: 'targetType 仅支持 user/group' });
      return;
    }

    const account = accounts.find((a) => a.id === accountId);
    if (!account) {
      res.status(404).json({ error: '账号不存在' });
      return;
    }

    try {
      await ensureAccountTransportReady(account);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
      return;
    }

    let conv = conversations.find(
      (c) => c.accountId === accountId && c.peerId === targetId && c.peerType === resolvedTargetType
    );
    if (!conv) {
      conv = {
        id: id('conv'),
        accountId,
        peerId: targetId,
        peerType: resolvedTargetType,
        peerName: `${resolvedTargetType === 'group' ? '群聊' : '用户'} ${targetId}`,
        lastMessage: '',
        lastInboundMsgId: null,
        updatedAt: nowIso()
      };
      conversations.unshift(conv);
    }

    const msg: Message = {
      id: id('msg'),
      accountId,
      conversationId: conv.id,
      direction: 'out',
      text,
      createdAt: nowIso(),
      status: 'pending'
    };

    messages.push(msg);
    // 限制消息数量上限为 10000 条
    if (messages.length > 10000) {
      messages.splice(0, messages.length - 10000);
    }
    conv.lastMessage = text;
    conv.updatedAt = nowIso();
    scheduleSaveChatDataToDisk();

    try {
      const result = await sendTextMessage(
        account,
        targetId,
        text,
        conv.lastInboundMsgId || undefined,
        resolvedTargetType
      );
      // 更新消息状态为已发送
      msg.status = 'sent';
      scheduleSaveChatDataToDisk();
      res.status(201).json({
        accepted: true,
        messageId: msg.id,
        conversationId: conv.id,
        status: result.mode === 'onebot_v11' ? 'sent_to_onebot' : 'sent_to_platform',
        messageStatus: 'sent'
      });
    } catch (error) {
      setPlatformError(error);
      // 更新消息状态为发送失败
      msg.status = 'failed';
      scheduleSaveChatDataToDisk();
      res.status(502).json({
        accepted: false,
        error: error instanceof Error ? error.message : String(error),
        messageId: msg.id,
        conversationId: conv.id,
        status: 'platform_send_failed',
        messageStatus: 'failed'
      });
    }
  });

  // 更新会话标签（批量）
  app.put('/api/chat/conversations/:id/tags', (req, res) => {
    const { tags } = req.body as { tags?: string[] };
    const conv = conversations.find((c) => c.id === req.params.id);

    if (!conv) {
      res.status(404).json({ error: '会话不存在' });
      return;
    }

    // 验证标签格式
    if (!Array.isArray(tags)) {
      res.status(400).json({ error: 'tags 必须是数组' });
      return;
    }

    // 限制标签数量和长度
    const sanitizedTags = tags
      .filter((t): t is string => typeof t === 'string')
      .map((t) => t.trim().slice(0, 20))
      .filter((t) => t.length > 0)
      .slice(0, 5); // 最多5个标签

    conv.tags = sanitizedTags;
    conv.updatedAt = nowIso();
    scheduleSaveChatDataToDisk();

    res.json({ success: true, conversation: conv });
  });

  // 添加单个标签
  app.post('/api/chat/conversations/:id/tags', (req, res) => {
    const { tag } = req.body as { tag?: string };
    const conv = conversations.find((c) => c.id === req.params.id);

    if (!conv) {
      res.status(404).json({ error: '会话不存在' });
      return;
    }

    if (!tag || typeof tag !== 'string') {
      res.status(400).json({ error: 'tag 必须是非空字符串' });
      return;
    }

    const trimmedTag = tag.trim().slice(0, 20);
    if (trimmedTag.length === 0) {
      res.status(400).json({ error: '标签不能为空' });
      return;
    }

    // 初始化标签数组
    if (!conv.tags) {
      conv.tags = [];
    }

    // 检查是否已存在
    if (conv.tags.includes(trimmedTag)) {
      res.status(400).json({ error: '标签已存在' });
      return;
    }

    // 限制标签数量
    if (conv.tags.length >= 5) {
      res.status(400).json({ error: '最多只能添加5个标签' });
      return;
    }

    conv.tags.push(trimmedTag);
    conv.updatedAt = nowIso();
    scheduleSaveChatDataToDisk();

    res.status(201).json({ success: true, conversation: conv });
  });

  // 删除单个标签
  app.delete('/api/chat/conversations/:id/tags/:tag', (req, res) => {
    const conv = conversations.find((c) => c.id === req.params.id);

    if (!conv) {
      res.status(404).json({ error: '会话不存在' });
      return;
    }

    const tagToDelete = decodeURIComponent(req.params.tag);

    if (!conv.tags) {
      res.status(404).json({ error: '会话没有标签' });
      return;
    }

    const index = conv.tags.indexOf(tagToDelete);
    if (index === -1) {
      res.status(404).json({ error: '标签不存在' });
      return;
    }

    conv.tags.splice(index, 1);
    if (conv.tags.length === 0) {
      delete conv.tags;
    }
    conv.updatedAt = nowIso();
    scheduleSaveChatDataToDisk();

    res.json({ success: true, conversation: conv });
  });

  // 撤回消息
  app.delete('/api/chat/messages/:id', async (req, res) => {
    const { id } = req.params;
    const msg = messages.find((m) => m.id === id);

    if (!msg) {
      res.status(404).json({ error: '消息不存在' });
      return;
    }

    // 只能撤回发出的消息
    if (msg.direction !== 'out') {
      res.status(400).json({ error: '只能撤回发出的消息' });
      return;
    }

    const account = accounts.find((a) => a.id === msg.accountId);
    if (!account) {
      res.status(404).json({ error: '账号不存在' });
      return;
    }

    try {
      await ensureAccountTransportReady(account);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
      return;
    }

    // 获取会话信息以确定 targetId 和 targetType
    const conv = conversations.find((c) => c.id === msg.conversationId);
    if (!conv) {
      res.status(404).json({ error: '会话不存在' });
      return;
    }

    try {
      // 调用 QQ API 撤回消息
      // 注意：QQ API 撤回消息需要使用平台返回的消息 ID，而非本地 ID
      // 这里我们使用 msg.id 作为临时方案，实际可能需要存储平台消息 ID
      const result = await recallPlatformMessage(account, conv.peerId, id, conv.peerType);

      if (result.success) {
        // 从本地存储中删除消息
        const index = messages.findIndex((m) => m.id === id);
        if (index !== -1) {
          messages.splice(index, 1);
          scheduleSaveChatDataToDisk();
        }
        res.json({ success: true, message: '消息已撤回' });
      } else {
        res.status(500).json({ error: '撤回消息失败' });
      }
    } catch (error) {
      setPlatformError(error);
      res.status(502).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // 上传并发送图片消息
  app.post('/api/chat/messages/upload-image', async (req, res) => {
    const { accountId, targetId, targetType } = req.body as {
      accountId?: string;
      targetId?: string;
      targetType?: 'user' | 'group';
    };

    if (!accountId || !targetId) {
      res.status(400).json({ error: 'accountId/targetId 为必填项' });
      return;
    }

    const account = accounts.find((a) => a.id === accountId);
    if (!account) {
      res.status(404).json({ error: '账号不存在' });
      return;
    }

    try {
      await ensureAccountTransportReady(account);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
      return;
    }

    // 检查是否有文件上传
    if (!req.files || !('file' in req.files) || !req.files.file) {
      res.status(400).json({ error: '未找到上传的图片文件' });
      return;
    }

    const file = req.files.file;
    const resolvedTargetType = targetType === 'group' ? 'group' : 'user';

    try {
      // 获取文件的 Buffer
      let fileBuffer: Buffer;
      if (Array.isArray(file)) {
        fileBuffer = file[0].data;
      } else {
        fileBuffer = file.data;
      }

      const fileName = Array.isArray(file) ? file[0].name : file.name;

      // 1. 上传图片到 QQ 服务器
      const uploadResult = await uploadPlatformImage(account, targetId, fileBuffer, fileName, resolvedTargetType);

      if (!uploadResult.success || !uploadResult.fileInfo) {
        res.status(500).json({ error: '图片上传失败' });
        return;
      }

      // 2. 发送图片消息
      const sendResult = await sendPlatformImageMessage(account, targetId, uploadResult.fileInfo, resolvedTargetType);

      if (sendResult.success) {
        // 查找或创建会话
        let conv = conversations.find(
          (c) => c.accountId === accountId && c.peerId === targetId && c.peerType === resolvedTargetType
        );

        if (!conv) {
          conv = {
            id: id('conv'),
            accountId,
            peerId: targetId,
            peerType: resolvedTargetType,
            peerName: targetId,
            lastMessage: '[图片]',
            lastInboundMsgId: null,
            updatedAt: nowIso()
          };
          conversations.push(conv);
        } else {
          conv.updatedAt = nowIso();
        }

        // 创建本地消息记录
        const msg: Message = {
          id: id('msg'),
          conversationId: conv.id,
          accountId,
          direction: 'out',
          text: '[图片]',
          createdAt: nowIso(),
          status: 'sent'
        };
        messages.push(msg);
        scheduleSaveChatDataToDisk();

        res.json({ success: true, messageId: msg.id, fileInfo: uploadResult.fileInfo });
      } else {
        res.status(500).json({ error: '图片消息发送失败' });
      }
    } catch (error) {
      setPlatformError(error);
      res.status(502).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });
}
