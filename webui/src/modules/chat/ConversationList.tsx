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

type ViewMode = 'all' | 'users' | 'groups';

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
  const [viewMode, setViewMode] = useState<ViewMode>('all');

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

  // 根据视图模式、关键词、置顶和标签筛选
  const filteredConversations = useMemo(() => {
    let items = filteredByAccount;

    // 视图模式筛选
    if (viewMode === 'users') {
      items = items.filter((c) => c.peerType === 'user');
    } else if (viewMode === 'groups') {
      items = items.filter((c) => c.peerType === 'group');
    }

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
  }, [filteredByAccount, viewMode, keyword, showPinnedOnly, tagFilter]);

  // 统计数据
  const stats = useMemo(() => {
    const users = filteredByAccount.filter((c) => c.peerType === 'user').length;
    const groups = filteredByAccount.filter((c) => c.peerType === 'group').length;
    const pinned = filteredByAccount.filter((c) => c.isPinned).length;
    return { users, groups, pinned, total: filteredByAccount.length };
  }, [filteredByAccount]);

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
    <div className="w-64 lg:w-72 xl:w-80 min-w-[200px] max-w-[360px] border-r bg-card flex flex-col shrink-0">
      {/* 搜索和筛选栏 */}
      <div className="p-3 lg:p-4 border-b space-y-2 lg:space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base lg:text-lg">💬 消息</h2>
          <Button
            variant={showPinnedOnly ? 'default' : 'outline'}
            size="sm"
            className="h-6 lg:h-7 px-2 text-[10px] lg:text-xs"
            onClick={() => setShowPinnedOnly(!showPinnedOnly)}
            title={showPinnedOnly ? '显示全部' : '仅显示置顶'}
          >
            📌 {stats.pinned}
          </Button>
        </div>

        {/* 搜索框 */}
        <div className="relative">
          <span className="absolute left-2.5 lg:left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs lg:text-sm">
            🔍
          </span>
          <Input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索会话、联系人..."
            className="pl-7 lg:pl-9 h-8 lg:h-9 text-xs lg:text-sm"
          />
        </div>

        {/* 视图模式切换 */}
        <div className="flex gap-1 p-0.5 lg:p-1 bg-muted/50 rounded-lg">
          <Button
            variant={viewMode === 'all' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1 h-6 lg:h-7 text-[10px] lg:text-xs"
            onClick={() => setViewMode('all')}
          >
            全部 ({stats.total})
          </Button>
          <Button
            variant={viewMode === 'users' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1 h-6 lg:h-7 text-[10px] lg:text-xs"
            onClick={() => setViewMode('users')}
          >
            👤 私聊 ({stats.users})
          </Button>
          <Button
            variant={viewMode === 'groups' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1 h-6 lg:h-7 text-[10px] lg:text-xs"
            onClick={() => setViewMode('groups')}
          >
            👥 群聊 ({stats.groups})
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

        {filterAccountId && (
          <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
            📱 当前账号：{getAccountName(filterAccountId)}
          </div>
        )}
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-6 lg:p-8 text-center">
            <div className="text-3xl lg:text-4xl mb-2 lg:mb-3">📭</div>
            <p className="text-muted-foreground text-xs lg:text-sm">暂无会话</p>
            <p className="text-muted-foreground text-[10px] lg:text-xs mt-1">
              {keyword ? '试试其他搜索词' : '开始聊天吧'}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5 p-1 lg:p-2">
            {filteredConversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  "relative rounded-lg lg:rounded-xl transition-all duration-200 group",
                  selectedConversationId === conv.id
                    ? "bg-primary/10 ring-2 ring-primary/30"
                    : "hover:bg-muted/50"
                )}
              >
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-2 lg:gap-3 h-auto py-2 lg:py-3 px-2 lg:px-3 text-left",
                    conv.isPinned && "border-l-4 border-l-primary/60"
                  )}
                  onClick={() => onSelectConversation(conv)}
                >
                  {/* 头像 */}
                  <div className="relative flex-shrink-0">
                    <div className={cn(
                      "w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center font-medium text-sm lg:text-base shadow-sm",
                      conv.peerType === 'group'
                        ? "bg-gradient-to-br from-blue-400 to-blue-600 text-white"
                        : "bg-gradient-to-br from-green-400 to-green-600 text-white"
                    )}>
                      {conv.avatar ? (
                        <img src={conv.avatar} alt={conv.peerName} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span>{conv.peerName.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    {/* 未读消息角标 */}
                    {conv.unreadCount && conv.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] lg:text-xs rounded-full min-w-[16px] lg:min-w-[20px] h-4 lg:h-5 flex items-center justify-center px-0.5 lg:px-1 font-medium shadow-sm">
                        {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                      </span>
                    )}
                    {/* 在线状态（私聊） */}
                    {conv.peerType === 'user' && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 lg:w-3 lg:h-3 bg-green-500 border-2 border-card rounded-full" />
                    )}
                  </div>

                  {/* 会话信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 lg:gap-2 mb-0.5 lg:mb-1">
                      <span className="font-medium text-xs lg:text-sm truncate flex-1">
                        {conv.remark || conv.peerName}
                      </span>
                      <span className="text-[10px] lg:text-xs text-muted-foreground flex-shrink-0">
                        {fmtTime(conv.updatedAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 lg:gap-2">
                      <Badge variant="outline" className={cn(
                        "text-[10px] lg:text-xs px-1 lg:px-1.5 py-0 h-3.5 lg:h-4",
                        conv.peerType === 'group'
                          ? "border-blue-300 text-blue-600 dark:border-blue-600 dark:text-blue-400"
                          : "border-green-300 text-green-600 dark:border-green-600 dark:text-green-400"
                      )}>
                        {conv.peerType === 'group' ? '👥 群' : '👤 私'}
                      </Badge>
                      <p className="text-[10px] lg:text-xs text-muted-foreground truncate flex-1">
                        {conv.lastMessage || '暂无消息'}
                      </p>
                    </div>

                    {/* 标签显示 */}
                    {(conv.tags || []).length > 0 && (
                      <div className="flex gap-1 mt-1 lg:mt-1.5 flex-wrap">
                        {(conv.tags || []).slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px] lg:text-xs px-1 lg:px-1.5 py-0 h-3.5 lg:h-4">
                            {tag}
                          </Badge>
                        ))}
                        {(conv.tags || []).length > 3 && (
                          <Badge variant="secondary" className="text-[10px] lg:text-xs px-1 lg:px-1.5 py-0 h-3.5 lg:h-4">
                            +{(conv.tags || []).length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* 多账号模式下显示来源账号 */}
                    {!filterAccountId && (
                      <span className="text-[10px] lg:text-xs text-muted-foreground mt-0.5 lg:mt-1 block opacity-70">
                        📱 {getAccountName(conv.accountId)}
                      </span>
                    )}
                  </div>

                  {/* 置顶标记 */}
                  {conv.isPinned && (
                    <span className="absolute top-1.5 lg:top-2 right-1.5 lg:right-2 text-[10px] lg:text-xs opacity-60">📌</span>
                  )}
                </Button>

                {/* 标签编辑按钮 */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute bottom-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
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
                      <span className="text-sm font-medium">🏷️ 管理标签</span>
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
