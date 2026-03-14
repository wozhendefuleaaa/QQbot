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
        ✓
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">
            {conversation ? (conversation.remark || conversation.peerName) : '选择会话'}
          </h2>
          {conversation && (
            <Badge variant={conversation.peerType === 'group' ? 'default' : 'secondary'}>
              {conversation.peerType === 'group' ? '群聊' : '私聊'}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {conversation && conversation.peerType === 'group' && accountId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGroupManage(true)}
            >
              ⚙️ 群管理
            </Button>
          )}
          {conversation && (
            <span className="text-sm text-muted-foreground">
              ID: {conversation.peerId}
            </span>
          )}
        </div>
      </div>

      {/* 消息区域 */}
      <div className="flex-1 overflow-auto p-4" onClick={closeContextMenu}>
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">暂无消息</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* 加载更多按钮 */}
            {hasMoreMessages && (
              <div className="flex justify-center mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? '加载中...' : '↑ 加载更多消息'}
                </Button>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "max-w-[80%] p-3 rounded-lg cursor-context-menu",
                  msg.direction === 'out'
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "mr-auto bg-muted"
                )}
                onContextMenu={(e) => handleContextMenu(e, msg.id)}
              >
                {/* 引用消息 */}
                {msg.replyTo && (
                  <div className="flex items-center gap-1 mb-1 text-xs opacity-70 border-l-2 pl-2">
                    <span>↩</span>
                    <span className="truncate">
                      {messages.find((m) => m.id === msg.replyTo)?.text.slice(0, 50) || '原消息'}
                      ...
                    </span>
                  </div>
                )}

                {/* 消息内容 */}
                <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>

                {/* 消息元信息 */}
                <div className="flex items-center justify-end gap-2 mt-1">
                  <span className="text-xs opacity-70">{fmtTime(msg.createdAt)}</span>
                  {msg.direction === 'out' && <MessageStatusIndicator status={msg.status} />}
                </div>

                {/* @提及 */}
                {msg.mentionedUsers && msg.mentionedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {msg.mentionedUsers.map((user) => (
                      <Badge key={user} variant="outline" className="text-xs">
                        @{user}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* 右键菜单 */}
        {showContextMenu && (
          <Card
            className="fixed z-50 p-1 shadow-lg min-w-[100px]"
            style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleCopy}>
              复制
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleReply}>
              回复
            </Button>
            {messages.find((m) => m.id === selectedMsgId)?.status === 'failed' && onRetry && (
              <Button variant="ghost" size="sm" className="w-full justify-start text-yellow-600" onClick={handleRetry}>
                重试
              </Button>
            )}
            {messages.find((m) => m.id === selectedMsgId)?.direction === 'out' && onRecall && (
              <Button variant="ghost" size="sm" className="w-full justify-start text-red-600" onClick={handleRecall}>
                撤回
              </Button>
            )}
          </Card>
        )}
      </div>

      {/* 输入区域 */}
      <form onSubmit={onSendMessage} className="border-t p-4 space-y-3 bg-card">
        {/* 目标选择 */}
        <div className="flex gap-2">
          <div className="flex rounded-lg border overflow-hidden">
            <Button
              type="button"
              variant={sendForm.targetType === 'user' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => onSendFormChange({ ...sendForm, targetType: 'user' })}
            >
              私聊
            </Button>
            <Button
              type="button"
              variant={sendForm.targetType === 'group' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => onSendFormChange({ ...sendForm, targetType: 'group' })}
            >
              群聊
            </Button>
          </div>
          <Input
            type="text"
            value={sendForm.targetId}
            onChange={(e) => onSendFormChange({ ...sendForm, targetId: e.target.value })}
            placeholder={sendForm.targetType === 'group' ? '群 ID' : '用户 ID'}
            required
            className="flex-1"
          />
        </div>

        {/* 快捷回复面板 */}
        {showQuickReplies && (
          <Card className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">快捷回复</span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowQuickReplies(false)}>
                ×
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickReplies.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无快捷回复</p>
              ) : (
                quickReplies.map((qr) => (
                  <Button
                    key={qr.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleUseQuickReply(qr.text)}
                    title={qr.text}
                  >
                    {qr.text.length > 30 ? `${qr.text.slice(0, 30)}...` : qr.text}
                  </Button>
                ))
              )}
            </div>
          </Card>
        )}

        {/* 消息输入 */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant={showQuickReplies ? 'default' : 'outline'}
            size="icon"
            onClick={handleToggleQuickReplies}
            title="快捷回复"
          >
            📝
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleSelectImage}
            disabled={isUploading || !conversation}
            title="发送图片"
          >
            {isUploading ? '⏳' : '🖼️'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
          <textarea
            value={sendForm.text}
            onChange={(e) => onSendFormChange({ ...sendForm, text: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="输入消息，Enter 发送，Shift+Enter 换行"
            rows={3}
            required
            className="flex-1 min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none"
          />
          <Button type="submit">发送</Button>
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
