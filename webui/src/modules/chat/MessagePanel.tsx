import { FormEvent, useRef, useState } from 'react';
import { fmtTime } from '../../services/api';
import { ChatMessage, Conversation, MessageStatus, QuickReply } from '../../types';
import { GroupManagePanel } from './GroupManagePanel';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';

type Props = {
  conversation: Conversation | undefined;
  messages: ChatMessage[];
  sendForm: { targetType: 'user' | 'group'; targetId: string; text: string };
  onSendFormChange: (next: { targetType: 'user' | 'group'; targetId: string; text: string }) => void;
  onSendMessage: (e: FormEvent) => void;
  onReplyTo?: (messageId: string) => void;
  onRetry?: (messageId: string) => void;
  onRecall?: (messageId: string) => void;
  onUploadImage?: (file: File) => void;
  quickReplies?: QuickReply[];
  onLoadQuickReplies?: () => void;
  accountId?: string;
  platformConnected?: boolean;
  connectedAccountId?: string | null;
  hasMoreMessages?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
};

function MessageStatusIndicator({ status }: { status?: MessageStatus }) {
  if (!status || status === 'sent') {
    return (
      <span className="text-green-500 text-xs" title="已发送">
        ✓✓
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className="text-yellow-500 text-xs animate-pulse" title="发送中">
        ◐
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="text-red-500 text-xs" title="发送失败">
        ✗
      </span>
    );
  }
  return null;
}

export function MessagePanel({
  conversation,
  messages,
  sendForm,
  onSendFormChange,
  onSendMessage,
  onReplyTo,
  onRetry,
  onRecall,
  onUploadImage,
  quickReplies = [],
  onLoadQuickReplies,
  accountId,
  platformConnected,
  connectedAccountId,
  hasMoreMessages = false,
  loadingMore = false,
  onLoadMore
}: Props) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showGroupManage, setShowGroupManage] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 常用表情列表
  const commonEmojis = [
    '😀', '😂', '🤣', '😊', '😍', '🥰', '😘', '😎',
    '🤔', '😅', '👍', '👎', '❤️', '💔', '🎉', '🎂',
    '🌟', '✨', '🔥', '💪', '🙏', '👏', '😢', '😭',
    '😤', '😠', '🤝', '💯', '✅', '❌', '⚡', '🌈'
  ];

  // 处理右键菜单
  const handleContextMenu = (e: React.MouseEvent, msgId: string) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedMsgId(msgId);
    setShowContextMenu(true);
  };

  // 关闭菜单
  const closeContextMenu = () => {
    setShowContextMenu(false);
    setSelectedMsgId(null);
  };

  // 复制消息
  const handleCopy = () => {
    const msg = messages.find((m) => m.id === selectedMsgId);
    if (msg) {
      navigator.clipboard.writeText(msg.text);
    }
    closeContextMenu();
  };

  // 回复消息
  const handleReply = () => {
    if (selectedMsgId && onReplyTo) {
      onReplyTo(selectedMsgId);
    }
    closeContextMenu();
  };

  // 重试发送
  const handleRetry = () => {
    if (selectedMsgId && onRetry) {
      onRetry(selectedMsgId);
    }
    closeContextMenu();
  };

  // 撤回消息
  const handleRecall = () => {
    if (selectedMsgId && onRecall) {
      onRecall(selectedMsgId);
    }
    closeContextMenu();
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  };

  // 使用快捷回复
  const handleUseQuickReply = (text: string) => {
    onSendFormChange({ ...sendForm, text });
    setShowQuickReplies(false);
  };

  // 切换快捷回复面板
  const handleToggleQuickReplies = () => {
    if (!showQuickReplies && onLoadQuickReplies) {
      onLoadQuickReplies();
    }
    setShowQuickReplies(!showQuickReplies);
    setShowEmojiPicker(false);
  };

  // 切换表情面板
  const handleToggleEmojiPicker = () => {
    setShowEmojiPicker(!showEmojiPicker);
    setShowQuickReplies(false);
  };

  // 插入表情
  const handleInsertEmoji = (emoji: string) => {
    onSendFormChange({ ...sendForm, text: sendForm.text + emoji });
  };

  // 选择图片文件
  const handleSelectImage = () => {
    fileInputRef.current?.click();
  };

  // 上传图片
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    // 验证文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过 10MB');
      return;
    }

    if (onUploadImage) {
      setIsUploading(true);
      try {
        await onUploadImage(file);
      } finally {
        setIsUploading(false);
      }
    }

    // 清空文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-card overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-card to-muted/20">
        <div className="flex items-center gap-3">
          {conversation && (
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-medium text-white shadow-sm",
              conversation.peerType === 'group'
                ? "bg-gradient-to-br from-blue-400 to-blue-600"
                : "bg-gradient-to-br from-green-400 to-green-600"
            )}>
              {conversation.peerName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">
                {conversation ? (conversation.remark || conversation.peerName) : '选择会话'}
              </h2>
              {conversation && (
                <Badge variant={conversation.peerType === 'group' ? 'default' : 'secondary'} className="text-xs">
                  {conversation.peerType === 'group' ? '👥 群聊' : '👤 私聊'}
                </Badge>
              )}
            </div>
            {conversation && (
              <span className="text-xs text-muted-foreground">
                ID: {conversation.peerId}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {conversation && conversation.peerType === 'group' && accountId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGroupManage(true)}
              className="gap-1"
            >
              ⚙️ 群管理
            </Button>
          )}
          {conversation && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-muted-foreground"
            >
              ℹ️ 详情
            </Button>
          )}
        </div>
      </div>

      {/* 消息区域 */}
      <div 
        className="flex-1 overflow-auto p-4 space-y-3"
        onClick={closeContextMenu}
        style={{ 
          backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--muted-foreground) / 0.1) 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-muted-foreground text-lg">开始聊天吧</p>
            <p className="text-muted-foreground text-sm mt-1">
              发送消息开始与对方的对话
            </p>
          </div>
        ) : (
          <>
            {/* 加载更多按钮 */}
            {hasMoreMessages && (
              <div className="flex justify-center mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLoadMore}
                  disabled={loadingMore}
                  className="bg-card/80 backdrop-blur-sm"
                >
                  {loadingMore ? '⏳ 加载中...' : '↑ 加载更多历史消息'}
                </Button>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "max-w-[75%] group",
                  msg.direction === 'out' ? "ml-auto" : "mr-auto"
                )}
              >
                <div
                  className={cn(
                    "relative p-3 rounded-2xl cursor-context-menu shadow-sm transition-all",
                    msg.direction === 'out'
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted rounded-bl-sm",
                    "hover:shadow-md"
                  )}
                  onContextMenu={(e) => handleContextMenu(e, msg.id)}
                >
                  {/* 引用消息 */}
                  {msg.replyTo && (
                    <div className={cn(
                      "flex items-center gap-1 mb-1.5 text-xs opacity-80 border-l-2 pl-2 rounded-sm",
                      msg.direction === 'out' ? "border-primary-foreground/50" : "border-primary/50"
                    )}>
                      <span>↩</span>
                      <span className="truncate max-w-[200px]">
                        {messages.find((m) => m.id === msg.replyTo)?.text.slice(0, 50) || '原消息'}
                        ...
                      </span>
                    </div>
                  )}

                  {/* 消息内容 */}
                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>

                  {/* 消息元信息 */}
                  <div className={cn(
                    "flex items-center justify-end gap-2 mt-1.5",
                    msg.direction === 'out' ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}>
                    <span className="text-xs">{fmtTime(msg.createdAt)}</span>
                    {msg.direction === 'out' && <MessageStatusIndicator status={msg.status} />}
                  </div>

                  {/* @提及 */}
                  {msg.mentionedUsers && msg.mentionedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {msg.mentionedUsers.map((user) => (
                        <Badge 
                          key={user} 
                          variant={msg.direction === 'out' ? 'secondary' : 'outline'} 
                          className="text-xs"
                        >
                          @{user}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* 消息操作提示 */}
                <div className={cn(
                  "text-xs text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity",
                  msg.direction === 'out' ? "text-right" : "text-left"
                )}>
                  右键查看更多操作
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}

        {/* 右键菜单 */}
        {showContextMenu && (
          <Card
            className="fixed z-50 p-1.5 shadow-xl min-w-[120px] border bg-card/95 backdrop-blur-sm"
            style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={handleCopy}>
              📋 复制
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={handleReply}>
              ↩️ 回复
            </Button>
            {messages.find((m) => m.id === selectedMsgId)?.status === 'failed' && onRetry && (
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-yellow-600" onClick={handleRetry}>
                🔄 重试
              </Button>
            )}
            {messages.find((m) => m.id === selectedMsgId)?.direction === 'out' && onRecall && (
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-red-600" onClick={handleRecall}>
                ↩️ 撤回
              </Button>
            )}
          </Card>
        )}
      </div>

      {/* 输入区域 */}
      <form onSubmit={onSendMessage} className="border-t p-4 space-y-3 bg-card">
        {/* 目标选择 - 简化版 */}
        {conversation && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg">
            <span>📤 发送至：</span>
            <Badge variant="outline" className="text-xs">
              {sendForm.targetType === 'group' ? '👥 群聊' : '👤 私聊'}
            </Badge>
            <span className="font-mono">{sendForm.targetId}</span>
          </div>
        )}

        {/* 快捷回复面板 */}
        {showQuickReplies && (
          <Card className="p-3 shadow-lg border bg-card/95 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">📝 快捷回复</span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowQuickReplies(false)}>
                ×
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickReplies.length === 0 ? (
                <div className="text-center py-4 w-full">
                  <p className="text-sm text-muted-foreground">暂无快捷回复</p>
                  <p className="text-xs text-muted-foreground mt-1">可在设置中添加常用回复</p>
                </div>
              ) : (
                quickReplies.map((qr) => (
                  <Button
                    key={qr.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleUseQuickReply(qr.text)}
                    title={qr.text}
                    className="h-auto py-1.5"
                  >
                    {qr.text.length > 20 ? `${qr.text.slice(0, 20)}...` : qr.text}
                  </Button>
                ))
              )}
            </div>
          </Card>
        )}

        {/* 表情选择面板 */}
        {/* 表情选择面板 */}
        {showEmojiPicker && (
          <Card className="p-3 shadow-lg border bg-card/95 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">😀 选择表情</span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowEmojiPicker(false)}>
                ×
              </Button>
            </div>
            <div className="grid grid-cols-8 gap-1">
              {commonEmojis.map((emoji) => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-lg hover:bg-muted"
                  onClick={() => handleInsertEmoji(emoji)}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </Card>
        )}

        {/* 工具栏和消息输入 */}
        <div className="flex gap-2 items-end">
          <div className="flex gap-1">
            <Button
              type="button"
              variant={showEmojiPicker ? 'default' : 'ghost'}
              size="icon"
              onClick={handleToggleEmojiPicker}
              title="选择表情"
              className="h-9 w-9"
            >
              😀
            </Button>
            <Button
              type="button"
              variant={showQuickReplies ? 'default' : 'ghost'}
              size="icon"
              onClick={handleToggleQuickReplies}
              title="快捷回复"
              className="h-9 w-9"
            >
              📝
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleSelectImage}
              disabled={isUploading || !conversation}
              title="发送图片"
              className="h-9 w-9"
            >
              {isUploading ? '⏳' : '🖼️'}
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
          <div className="flex-1 relative">
            <textarea
              value={sendForm.text}
              onChange={(e) => onSendFormChange({ ...sendForm, text: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder="输入消息... (Enter 发送，Shift+Enter 换行)"
              rows={1}
              required
              className="w-full min-h-[44px] max-h-[120px] px-4 py-2.5 text-sm rounded-2xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none"
              style={{ height: 'auto' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 120) + 'px';
              }}
            />
          </div>
          <Button
            type="submit"
            size="icon"
            className="h-11 w-11 rounded-full"
            disabled={!sendForm.text.trim()}
          >
            📤
          </Button>
        </div>

        {/* 提示信息 */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>💡 提示：按 Enter 快速发送，Shift+Enter 换行</span>
          {!platformConnected && (
            <span className="text-yellow-600">⚠️ 平台未连接</span>
          )}
        </div>
      </form>

      {/* 群管理面板 */}
      {showGroupManage && conversation && conversation.peerType === 'group' && accountId && (
        <GroupManagePanel
          groupId={conversation.peerId}
          accountId={accountId}
          platformConnected={platformConnected || false}
          connectedAccountId={connectedAccountId || null}
          onClose={() => setShowGroupManage(false)}
        />
      )}
    </div>
  );
}
