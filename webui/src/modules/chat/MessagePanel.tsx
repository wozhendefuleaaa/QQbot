import { FormEvent, useRef, useState } from 'react';
import { fmtTime } from '../../services/api';
import { ChatMessage, Conversation, MessageStatus, QuickReply } from '../../types';
import { GroupManagePanel } from './GroupManagePanel';

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
    return <span className="msg-status sent" title="已发送">✓✓</span>;
  }
  if (status === 'pending') {
    return <span className="msg-status pending" title="发送中">✓</span>;
  }
  if (status === 'failed') {
    return <span className="msg-status failed" title="发送失败">✗</span>;
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
    <div className="message-panel">
      {/* 头部 */}
      <div className="msg-panel-header">
        <div className="msg-panel-title">
          <h2>{conversation ? (conversation.remark || conversation.peerName) : '选择会话'}</h2>
          {conversation && (
            <span className={`conv-type-tag ${conversation.peerType}`}>
              {conversation.peerType === 'group' ? '群聊' : '私聊'}
            </span>
          )}
        </div>
        <div className="msg-panel-actions">
          {conversation && conversation.peerType === 'group' && accountId && (
            <button
              type="button"
              className="btn-group-manage"
              onClick={() => setShowGroupManage(true)}
              title="群管理"
            >
              ⚙️ 群管理
            </button>
          )}
          {conversation && (
            <div className="msg-panel-info">
              <span className="muted">ID: {conversation.peerId}</span>
            </div>
          )}
        </div>
      </div>

      {/* 消息区域 */}
      <div className="msg-list-container" onClick={closeContextMenu}>
        {messages.length === 0 ? (
          <div className="msg-empty">
            <p className="muted">暂无消息</p>
          </div>
        ) : (
          <div className="msg-list">
            {/* 加载更多按钮 */}
            {hasMoreMessages && (
              <div className="load-more-container">
                <button
                  type="button"
                  className="btn-load-more"
                  onClick={onLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? '加载中...' : '↑ 加载更多消息'}
                </button>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`msg-bubble ${msg.direction === 'out' ? 'outbound' : 'inbound'}`}
                onContextMenu={(e) => handleContextMenu(e, msg.id)}
              >
                {/* 引用消息 */}
                {msg.replyTo && (
                  <div className="msg-reply-to">
                    <span className="reply-indicator">↩</span>
                    <span className="reply-text">
                      {messages.find((m) => m.id === msg.replyTo)?.text.slice(0, 50) || '原消息'}
                      ...
                    </span>
                  </div>
                )}

                {/* 消息内容 */}
                <div className="msg-content">
                  <p className="msg-text">{msg.text}</p>
                </div>

                {/* 消息元信息 */}
                <div className="msg-meta">
                  <span className="msg-time">{fmtTime(msg.createdAt)}</span>
                  {msg.direction === 'out' && <MessageStatusIndicator status={msg.status} />}
                </div>

                {/* @提及 */}
                {msg.mentionedUsers && msg.mentionedUsers.length > 0 && (
                  <div className="msg-mentions">
                    {msg.mentionedUsers.map((user) => (
                      <span key={user} className="mention-tag">@{user}</span>
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
          <div
            className="context-menu"
            style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" onClick={handleCopy}>复制</button>
            <button type="button" onClick={handleReply}>回复</button>
            {messages.find((m) => m.id === selectedMsgId)?.status === 'failed' && onRetry && (
              <button type="button" onClick={handleRetry} className="retry-btn">重试</button>
            )}
            {messages.find((m) => m.id === selectedMsgId)?.direction === 'out' && onRecall && (
              <button type="button" onClick={handleRecall} className="recall-btn">撤回</button>
            )}
          </div>
        )}
      </div>

      {/* 输入区域 */}
      <form onSubmit={onSendMessage} className="msg-input-area">
        {/* 目标选择 */}
        <div className="input-row target-row">
          <div className="segmented">
            <button
              type="button"
              className={sendForm.targetType === 'user' ? 'seg active' : 'seg'}
              onClick={() => onSendFormChange({ ...sendForm, targetType: 'user' })}
            >
              私聊
            </button>
            <button
              type="button"
              className={sendForm.targetType === 'group' ? 'seg active' : 'seg'}
              onClick={() => onSendFormChange({ ...sendForm, targetType: 'group' })}
            >
              群聊
            </button>
          </div>
          <input
            type="text"
            value={sendForm.targetId}
            onChange={(e) => onSendFormChange({ ...sendForm, targetId: e.target.value })}
            placeholder={sendForm.targetType === 'group' ? '群 ID' : '用户 ID'}
            required
          />
        </div>

        {/* 快捷回复面板 */}
        {showQuickReplies && (
          <div className="quick-reply-panel">
            <div className="quick-reply-header">
              <span>快捷回复</span>
              <button type="button" className="btn-close" onClick={() => setShowQuickReplies(false)}>×</button>
            </div>
            <div className="quick-reply-list">
              {quickReplies.length === 0 ? (
                <p className="muted">暂无快捷回复</p>
              ) : (
                quickReplies.map((qr) => (
                  <button
                    key={qr.id}
                    type="button"
                    className="quick-reply-item"
                    onClick={() => handleUseQuickReply(qr.text)}
                    title={qr.text}
                  >
                    {qr.text.length > 30 ? `${qr.text.slice(0, 30)}...` : qr.text}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* 消息输入 */}
        <div className="input-row compose-row">
          <button
            type="button"
            className={`btn-quick-reply ${showQuickReplies ? 'active' : ''}`}
            onClick={handleToggleQuickReplies}
            title="快捷回复"
          >
            📝
          </button>
          <button
            type="button"
            className="btn-upload-image"
            onClick={handleSelectImage}
            disabled={isUploading || !conversation}
            title="发送图片"
          >
            {isUploading ? '⏳' : '🖼️'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImageChange}
          />
          <textarea
            value={sendForm.text}
            onChange={(e) => onSendFormChange({ ...sendForm, text: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="输入消息，Enter 发送，Shift+Enter 换行"
            rows={3}
            required
          />
          <button type="submit" className="btn-send">发送</button>
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
