import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';
import { BotAccount, ChatMessage, Conversation, PlatformStatus, QuickReply } from '../../types';
import { AccountNav } from './AccountNav';
import { ConversationList } from './ConversationList';
import { MessagePanel } from './MessagePanel';

type Props = {
  accounts: BotAccount[];
  platformStatus: PlatformStatus;
};

export function ChatPanel({ accounts, platformStatus }: Props) {
  // 状态
  const [filterAccountId, setFilterAccountId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sendForm, setSendForm] = useState({
    targetType: 'user' as 'user' | 'group',
    targetId: '',
    text: ''
  });
  const [loading, setLoading] = useState(false);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  
  // SSE 连接引用
  const eventSourceRef = useRef<EventSource | null>(null);

  // 加载所有会话（多账号聚合）
  const loadAllConversations = useCallback(async () => {
    try {
      // 获取所有账号的会话
      const allConvs: Conversation[] = [];
      for (const account of accounts) {
        const result = await api<{ items: Conversation[] }>(`/api/conversations?accountId=${account.id}`);
        allConvs.push(...result.items);
      }
      // 按更新时间排序
      allConvs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      setConversations(allConvs);
    } catch (error) {
      console.error('加载会话失败:', error);
    }
  }, [accounts]);

  // 根据筛选账号加载会话
  const loadConversations = useCallback(async () => {
    if (!filterAccountId) {
      await loadAllConversations();
      return;
    }
    
    try {
      const result = await api<{ items: Conversation[] }>(`/api/conversations?accountId=${filterAccountId}`);
      setConversations(result.items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    } catch (error) {
      console.error('加载会话失败:', error);
    }
  }, [filterAccountId, loadAllConversations]);

  // 加载消息
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const result = await api<{ items: ChatMessage[]; hasMore: boolean }>(`/api/conversations/${conversationId}/messages?limit=50`);
      setMessages(result.items);
      setHasMoreMessages(result.hasMore);
    } catch (error) {
      console.error('加载消息失败:', error);
    }
  }, []);

  // 加载更多消息（向上翻页）
  const loadMoreMessages = useCallback(async () => {
    if (!selectedConversation || loadingMore || !hasMoreMessages) return;

    setLoadingMore(true);
    try {
      // 获取最早消息的时间戳作为游标
      const oldestMessage = messages[0];
      if (!oldestMessage) {
        setLoadingMore(false);
        return;
      }

      const result = await api<{ items: ChatMessage[]; hasMore: boolean }>(
        `/api/conversations/${selectedConversation.id}/messages?before=${oldestMessage.createdAt}&limit=50`
      );

      // 将旧消息插入到前面
      setMessages((prev) => [...result.items, ...prev]);
      setHasMoreMessages(result.hasMore);
    } catch (error) {
      console.error('加载更多消息失败:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [selectedConversation, loadingMore, hasMoreMessages, messages]);

  // 加载快捷回复
  const loadQuickReplies = useCallback(async () => {
    try {
      const result = await api<{ items: QuickReply[] }>('/api/quick-replies');
      setQuickReplies(result.items);
    } catch (error) {
      console.error('加载快捷回复失败:', error);
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    if (accounts.length > 0) {
      loadConversations();
    }
  }, [accounts, loadConversations]);

  // SSE 实时消息连接 - 只在组件挂载时建立一次
  useEffect(() => {
    let isSubscribed = true;
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    
    const connectSSE = () => {
      if (!isSubscribed) return;
      
      // 如果已有连接，先关闭
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      // 使用相对路径，通过 vite 代理转发到后端
      const eventSource = new EventSource('/api/sse/events');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('[SSE] 已连接');
      };

      eventSource.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[SSE] 收到消息:', data);
          
          // 如果消息属于当前选中的会话，添加到消息列表
          if (data.conversationId && data.message) {
            const newMsg: ChatMessage = data.message;
            const convId = data.conversationId;
            
            setMessages((prev) => {
              // 检查是否是当前会话的消息
              if (prev.length > 0 && prev[0].conversationId === convId) {
                // 避免重复添加
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              }
              // 如果消息列表为空，也添加
              if (prev.length === 0) {
                return [newMsg];
              }
              return prev;
            });
          }
          
          // 刷新会话列表以更新最后消息
          loadConversations();
        } catch (err) {
          console.error('[SSE] 解析消息失败:', err);
        }
      });

      eventSource.addEventListener('platform_status', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[SSE] 平台状态变化:', data);
        } catch (err) {
          console.error('[SSE] 解析平台状态失败:', err);
        }
      });

      eventSource.onerror = () => {
        console.error('[SSE] 连接错误，5秒后重连');
        eventSource.close();
        eventSourceRef.current = null;
        
        if (isSubscribed) {
          reconnectTimeout = setTimeout(() => {
            connectSSE();
          }, 5000);
        }
      };
    };

    connectSSE();

    return () => {
      isSubscribed = false;
      clearTimeout(reconnectTimeout);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在组件挂载时执行一次

  // 选择会话时加载消息
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      // 更新发送表单的目标
      setSendForm((prev) => ({
        ...prev,
        targetType: selectedConversation.peerType,
        targetId: selectedConversation.peerId
      }));
    }
  }, [selectedConversation, loadMessages]);

  // 发送消息
  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!sendForm.targetId || !sendForm.text || loading) return;

    // 确定使用哪个账号发送
    const activeAccountId = filterAccountId || (selectedConversation?.accountId) || platformStatus.connectedAccountId;
    if (!activeAccountId) {
      alert('请先选择一个账号或连接平台');
      return;
    }

    setLoading(true);
    
    // 乐观更新：先添加一个 pending 状态的消息
    const tempMsgId = `temp-${Date.now()}`;
    const tempMsg: ChatMessage = {
      id: tempMsgId,
      accountId: activeAccountId,
      conversationId: selectedConversation?.id || '',
      direction: 'out',
      text: sendForm.text,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };
    
    // 先显示消息
    setMessages((prev) => [...prev, tempMsg]);
    setSendForm((prev) => ({ ...prev, text: '' }));

    try {
      const result = await api<{
        accepted: boolean;
        messageId: string;
        conversationId: string;
        messageStatus?: 'sent' | 'failed';
      }>('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: activeAccountId,
          targetId: sendForm.targetId,
          text: tempMsg.text,
          targetType: sendForm.targetType
        })
      });
      
      // 更新消息状态：用服务器返回的真实消息替换临时消息
      if (result.messageStatus === 'sent') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempMsgId ? { ...m, status: 'sent' as const } : m
          )
        );
      }
      
      // 刷新会话和消息（获取服务器端完整数据）
      await loadConversations();
      if (selectedConversation) {
        await loadMessages(selectedConversation.id);
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      // 更新消息状态为失败
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempMsgId ? { ...m, status: 'failed' as const } : m
        )
      );
      alert('发送失败: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  // 回复消息
  const handleReplyTo = (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (msg) {
      setSendForm((prev) => ({
        ...prev,
        text: `> ${msg.text.slice(0, 100)}\n----------\n${prev.text}`
      }));
    }
  };

  // 重试发送失败的消息
  const handleRetry = (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg || msg.status !== 'failed') return;
    
    // 从消息列表中移除失败的消息
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    
    // 重新填充发送表单并触发发送
    setSendForm((prev) => ({
      ...prev,
      text: msg.text
    }));
    
    // 延迟触发发送
    setTimeout(() => {
      const form = document.querySelector('.msg-input-area') as HTMLFormElement;
      if (form) {
        form.requestSubmit();
      }
    }, 100);
  };

  // 撤回消息
  const handleRecall = async (messageId: string) => {
    if (!confirm('确定要撤回这条消息吗？')) return;
    
    try {
      const res = await api<{ success: boolean; message?: string }>(`/api/messages/${messageId}`, {
        method: 'DELETE'
      });
      
      if (res.success) {
        // 从本地消息列表中移除
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      } else {
        alert(res.message || '撤回失败');
      }
    } catch (err) {
      console.error('撤回消息失败:', err);
      alert('撤回消息失败');
    }
  };

  // 上传图片
  const handleUploadImage = async (file: File) => {
    if (!selectedConversation) {
      alert('请先选择会话');
      return;
    }

    const account = accounts.find((a) => a.id === selectedConversation.accountId);
    if (!account) {
      alert('找不到对应账号');
      return;
    }

    if (!platformStatus.connected || platformStatus.connectedAccountId !== selectedConversation.accountId) {
      alert('平台未连接，无法发送图片');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('accountId', selectedConversation.accountId);
      formData.append('targetId', selectedConversation.peerId);
      formData.append('targetType', selectedConversation.peerType);

      const res = await fetch('/api/messages/upload-image', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (data.success) {
        // 添加新消息到列表
        const newMsg: ChatMessage = {
          id: data.messageId,
          conversationId: selectedConversation.id,
          accountId: selectedConversation.accountId,
          direction: 'out',
          text: '[图片]',
          createdAt: new Date().toISOString(),
          status: 'sent'
        };
        setMessages((prev) => [...prev, newMsg]);
      } else {
        alert(data.error || '图片发送失败');
      }
    } catch (err) {
      console.error('上传图片失败:', err);
      alert('上传图片失败');
    }
  };

  // 选择账号筛选
  const handleSelectAccount = (accountId: string | null) => {
    setFilterAccountId(accountId);
    setSelectedConversation(undefined);
    setMessages([]);
  };

  // 选择会话
  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
  };

  return (
    <section className="panel panel-chat-v2">
      {/* 左侧：账号导航 */}
      <AccountNav
        accounts={accounts}
        selectedAccountId={filterAccountId}
        onSelectAccount={handleSelectAccount}
        platformConnectedId={platformStatus.connectedAccountId}
      />

      {/* 中间：会话列表 */}
      <ConversationList
        conversations={conversations}
        accounts={accounts}
        selectedConversationId={selectedConversation?.id || ''}
        onSelectConversation={handleSelectConversation}
        filterAccountId={filterAccountId}
        onConversationUpdate={loadConversations}
      />

      {/* 右侧：消息面板 */}
      <MessagePanel
        conversation={selectedConversation}
        messages={messages}
        sendForm={sendForm}
        onSendFormChange={setSendForm}
        onSendMessage={sendMessage}
        onReplyTo={handleReplyTo}
        onRetry={handleRetry}
        onRecall={handleRecall}
        onUploadImage={handleUploadImage}
        quickReplies={quickReplies}
        onLoadQuickReplies={loadQuickReplies}
        accountId={filterAccountId || undefined}
        platformConnected={platformStatus.connected}
        connectedAccountId={platformStatus.connectedAccountId}
        hasMoreMessages={hasMoreMessages}
        loadingMore={loadingMore}
        onLoadMore={loadMoreMessages}
      />
    </section>
  );
}
