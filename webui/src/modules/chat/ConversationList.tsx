import { FormEvent, useMemo, useState } from 'react';
import { fmtTime } from '../../services/api';
import { api } from '../../services/api';
import { BotAccount, Conversation } from '../../types';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';

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
    <div className="w-72 border-r bg-card flex flex-col">
      {/* 搜索和筛选栏 */}
      <div className="p-4 border-b space-y-3">
        <h2 className="font-semibold">会话列表</h2>
        <div className="flex gap-2">
          <Input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索会话..."
            className="flex-1 h-8 text-sm"
          />
          <Button
            variant={showPinnedOnly ? 'secondary' : 'ghost'}
            size="sm"
            className="px-2"
            onClick={() => setShowPinnedOnly(!showPinnedOnly)}
            title={showPinnedOnly ? '显示全部' : '仅显示置顶'}
          >
            📌
          </Button>
        </div>

        {/* 标签筛选 */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">标签：</span>
            <div className="flex gap-1 flex-wrap">
              <Badge
                variant={tagFilter === null ? 'default' : 'outline'}
                className="cursor-pointer text-xs"
                onClick={() => setTagFilter(null)}
              >
                全部
              </Badge>
              {allTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={tagFilter === tag ? 'default' : 'outline'}
                  className="cursor-pointer text-xs"
                  onClick={() => setTagFilter(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          {filterAccountId ? (
            <span>当前账号：{getAccountName(filterAccountId)}</span>
          ) : (
            <span>全部会话：{filteredConversations.length}</span>
          )}
        </div>
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            暂无会话
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredConversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  "relative rounded-lg transition-colors",
                  selectedConversationId === conv.id && "bg-secondary"
                )}
              >
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 h-auto py-2 px-3 text-left",
                    conv.isPinned && "border-l-2 border-l-primary"
                  )}
                  onClick={() => onSelectConversation(conv)}
                >
                  {/* 头像 */}
                  <div className="relative flex-shrink-0">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm",
                      conv.peerType === 'group' ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                    )}>
                      {conv.avatar ? (
                        <img src={conv.avatar} alt={conv.peerName} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span>{conv.peerName.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    {conv.unreadCount && conv.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                      </span>
                    )}
                  </div>

                  {/* 会话信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn(
                        "text-xs px-1",
                        conv.peerType === 'group' ? "border-blue-300 text-blue-600" : "border-green-300 text-green-600"
                      )}>
                        {conv.peerType === 'group' ? '群' : '私'}
                      </Badge>
                      <span className="font-medium text-sm truncate flex-1">{conv.remark || conv.peerName}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{fmtTime(conv.updatedAt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {conv.lastMessage || '暂无消息'}
                    </p>

                    {/* 标签显示 */}
                    {(conv.tags || []).length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {(conv.tags || []).slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs px-1 py-0 h-4">
                            {tag}
                          </Badge>
                        ))}
                        {(conv.tags || []).length > 3 && (
                          <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                            +{(conv.tags || []).length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* 多账号模式下显示来源账号 */}
                    {!filterAccountId && (
                      <span className="text-xs text-muted-foreground mt-0.5 block">
                        {getAccountName(conv.accountId)}
                      </span>
                    )}
                  </div>

                  {/* 置顶标记 */}
                  {conv.isPinned && (
                    <span className="absolute top-1 right-1 text-xs">📌</span>
                  )}
                </Button>

                {/* 标签编辑按钮 */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute bottom-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingTagsFor(editingTagsFor === conv.id ? null : conv.id);
                  }}
                  title="管理标签"
                >
                  🏷️
                </Button>

                {/* 标签编辑面板 */}
                {editingTagsFor === conv.id && (
                  <Card className="absolute z-10 top-full left-0 right-0 mt-1 p-3 shadow-lg" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">管理标签</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setEditingTagsFor(null)}
                      >
                        ×
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {(conv.tags || []).map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          {tag}
                          <button
                            type="button"
                            className="ml-1 hover:text-destructive"
                            onClick={() => handleRemoveTag(conv.id, tag)}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                      {(conv.tags || []).length === 0 && (
                        <span className="text-xs text-muted-foreground">暂无标签</span>
                      )}
                    </div>
                    <form
                      className="flex gap-2"
                      onSubmit={(e) => handleAddTag(e, conv.id)}
                    >
                      <Input
                        type="text"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        placeholder="添加新标签..."
                        maxLength={20}
                        className="flex-1 h-8 text-sm"
                      />
                      <Button type="submit" size="sm" className="h-8">
                        添加
                      </Button>
                    </form>
                    {(conv.tags || []).length >= 5 && (
                      <span className="text-xs text-muted-foreground mt-1 block">最多5个标签</span>
                    )}
                  </Card>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
