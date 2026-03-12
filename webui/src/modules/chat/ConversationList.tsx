import { FormEvent, useMemo, useState } from 'react';
import { fmtTime } from '../../services/api';
import { api } from '../../services/api';
import { BotAccount, Conversation } from '../../types';

type Props = {
  conversations: Conversation[];
  accounts: BotAccount[];
  selectedConversationId: string;
  onSelectConversation: (conversation: Conversation) => void;
  filterAccountId: string | null;
  onConversationUpdate?: () => void;
};

export function ConversationList({
  conversations,
  accounts,
  selectedConversationId,
  onSelectConversation,
  filterAccountId,
  onConversationUpdate
}: Props) {
  const [keyword, setKeyword] = useState('');
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [editingTagsFor, setEditingTagsFor] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState('');

  // 获取所有已使用的标签
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    conversations.forEach((c) => {
      (c.tags || []).forEach((t) => tagSet.add(t));
    });
    return Array.from(tagSet).sort();
  }, [conversations]);

  // 根据账号筛选会话
  const filteredByAccount = useMemo(() => {
    if (!filterAccountId) return conversations;
    return conversations.filter((c) => c.accountId === filterAccountId);
  }, [conversations, filterAccountId]);

  // 根据关键词、置顶和标签筛选
  const filteredConversations = useMemo(() => {
    let items = filteredByAccount;

    // 置顶筛选
    if (showPinnedOnly) {
      items = items.filter((c) => c.isPinned);
    }

    // 标签筛选
    if (tagFilter) {
      items = items.filter((c) => (c.tags || []).includes(tagFilter));
    }

    // 关键词搜索
    const q = keyword.trim().toLowerCase();
    if (q) {
      items = items.filter((c) => {
        const haystack = `${c.peerName} ${c.peerId} ${c.lastMessage} ${c.remark || ''} ${(c.tags || []).join(' ')}`.toLowerCase();
        return haystack.includes(q);
      });
    }

    // 排序：置顶优先，然后按更新时间
    return items.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [filteredByAccount, keyword, showPinnedOnly, tagFilter]);

  // 获取账号名称
  const getAccountName = (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId);
    return account?.name || accountId;
  };

  // 添加标签
  const handleAddTag = async (e: FormEvent, convId: string) => {
    e.preventDefault();
    if (!newTagInput.trim()) return;

    try {
      await api(`/api/conversations/${convId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: newTagInput.trim() })
      });
      setNewTagInput('');
      onConversationUpdate?.();
    } catch (err) {
      console.error('添加标签失败:', err);
    }
  };

  // 删除标签
  const handleRemoveTag = async (convId: string, tag: string) => {
    try {
      await api(`/api/conversations/${convId}/tags/${encodeURIComponent(tag)}`, {
        method: 'DELETE'
      });
      onConversationUpdate?.();
    } catch (err) {
      console.error('删除标签失败:', err);
    }
  };

  return (
    <div className="conversation-list-container">
      {/* 搜索和筛选栏 */}
      <div className="conv-list-header">
        <h2>会话列表</h2>
        <div className="conv-filter-row">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索会话..."
            className="conv-search"
          />
          <button
            type="button"
            className={`btn-icon ${showPinnedOnly ? 'active' : ''}`}
            onClick={() => setShowPinnedOnly(!showPinnedOnly)}
            title={showPinnedOnly ? '显示全部' : '仅显示置顶'}
          >
            📌
          </button>
        </div>

        {/* 标签筛选 */}
        {allTags.length > 0 && (
          <div className="tag-filter-row">
            <span className="tag-filter-label">标签：</span>
            <div className="tag-filter-chips">
              <button
                type="button"
                className={`tag-chip ${tagFilter === null ? 'active' : ''}`}
                onClick={() => setTagFilter(null)}
              >
                全部
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`tag-chip ${tagFilter === tag ? 'active' : ''}`}
                  onClick={() => setTagFilter(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="conv-count">
          {filterAccountId ? (
            <span className="muted">当前账号：{getAccountName(filterAccountId)}</span>
          ) : (
            <span className="muted">全部会话：{filteredConversations.length}</span>
          )}
        </div>
      </div>

      {/* 会话列表 */}
      <div className="conv-list">
        {filteredConversations.length === 0 ? (
          <div className="conv-empty">
            <p className="muted">暂无会话</p>
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <div
              key={conv.id}
              className={`conv-item-wrapper ${selectedConversationId === conv.id ? 'active' : ''}`}
            >
              <button
                className={`conv-item ${conv.isPinned ? 'pinned' : ''}`}
                onClick={() => onSelectConversation(conv)}
                type="button"
              >
                {/* 头像 */}
                <div className={`conv-avatar ${conv.peerType}`}>
                  {conv.avatar ? (
                    <img src={conv.avatar} alt={conv.peerName} />
                  ) : (
                    <span>{conv.peerName.charAt(0).toUpperCase()}</span>
                  )}
                  {conv.unreadCount && conv.unreadCount > 0 && (
                    <span className="unread-badge">{conv.unreadCount > 99 ? '99+' : conv.unreadCount}</span>
                  )}
                </div>

                {/* 会话信息 */}
                <div className="conv-content">
                  <div className="conv-title-row">
                    <span className={`conv-type-tag ${conv.peerType}`}>
                      {conv.peerType === 'group' ? '群' : '私'}
                    </span>
                    <span className="conv-name">{conv.remark || conv.peerName}</span>
                    <span className="conv-time">{fmtTime(conv.updatedAt)}</span>
                  </div>
                  <div className="conv-preview">
                    <span className="conv-last-msg">{conv.lastMessage || '暂无消息'}</span>
                  </div>

                  {/* 标签显示 */}
                  {(conv.tags || []).length > 0 && (
                    <div className="conv-tags">
                      {(conv.tags || []).map((tag) => (
                        <span key={tag} className="conv-tag">{tag}</span>
                      ))}
                    </div>
                  )}

                  {/* 多账号模式下显示来源账号 */}
                  {!filterAccountId && (
                    <div className="conv-account-tag">
                      <span className="account-label">{getAccountName(conv.accountId)}</span>
                    </div>
                  )}
                </div>

                {/* 置顶标记 */}
                {conv.isPinned && <span className="pin-indicator">📌</span>}
              </button>

              {/* 标签编辑按钮 */}
              <button
                type="button"
                className="conv-tag-edit-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingTagsFor(editingTagsFor === conv.id ? null : conv.id);
                }}
                title="管理标签"
              >
                🏷️
              </button>

              {/* 标签编辑面板 */}
              {editingTagsFor === conv.id && (
                <div className="conv-tag-editor" onClick={(e) => e.stopPropagation()}>
                  <div className="tag-editor-header">
                    <span>管理标签</span>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setEditingTagsFor(null)}
                    >
                      ×
                    </button>
                  </div>
                  <div className="tag-editor-tags">
                    {(conv.tags || []).map((tag) => (
                      <span key={tag} className="tag-item">
                        {tag}
                        <button
                          type="button"
                          className="tag-remove-btn"
                          onClick={() => handleRemoveTag(conv.id, tag)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {(conv.tags || []).length === 0 && (
                      <span className="muted">暂无标签</span>
                    )}
                  </div>
                  <form
                    className="tag-add-form"
                    onSubmit={(e) => handleAddTag(e, conv.id)}
                  >
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      placeholder="添加新标签..."
                      maxLength={20}
                    />
                    <button type="submit" className="btn-add-tag">
                      添加
                    </button>
                  </form>
                  {(conv.tags || []).length >= 5 && (
                    <span className="tag-limit-hint">最多5个标签</span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
