import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

type GroupMember = {
  id: string;
  name: string;
  avatar?: string;
};

type Props = {
  groupId: string;
  accountId: string;
  platformConnected: boolean;
  connectedAccountId: string | null;
  onClose: () => void;
};

export function GroupManagePanel({
  groupId,
  accountId,
  platformConnected,
  connectedAccountId,
  onClose
}: Props) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [muteDuration, setMuteDuration] = useState<Record<string, string>>({});

  const isConnected = platformConnected && connectedAccountId === accountId;

  // 加载群成员列表
  const loadMembers = async () => {
    if (!isConnected) {
      setError('平台未连接或账号不匹配');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await api<{ success: boolean; members?: GroupMember[]; error?: string }>(
        `/api/groups/${groupId}/members?accountId=${accountId}`
      );
      if (result.success && result.members) {
        setMembers(result.members);
      } else {
        setError(result.error || '获取群成员列表失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [groupId, accountId, isConnected]);

  // 禁言群成员
  const handleMute = async (userId: string) => {
    const durationStr = muteDuration[userId] || '60';
    const duration = parseInt(durationStr, 10);

    if (isNaN(duration) || duration <= 0) {
      alert('请输入有效的禁言时长（秒）');
      return;
    }

    if (duration > 30 * 24 * 60 * 60) {
      alert('禁言时长不能超过 30 天');
      return;
    }

    setActionLoading(userId);
    try {
      const result = await api<{ success: boolean; error?: string }>(
        `/api/groups/${groupId}/members/${userId}/mute`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId, duration })
        }
      );
      if (result.success) {
        alert('禁言成功');
      } else {
        alert(result.error || '禁言失败');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(null);
    }
  };

  // 解除禁言
  const handleUnmute = async (userId: string) => {
    setActionLoading(userId);
    try {
      const result = await api<{ success: boolean; error?: string }>(
        `/api/groups/${groupId}/members/${userId}/mute`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId })
        }
      );
      if (result.success) {
        alert('解除禁言成功');
      } else {
        alert(result.error || '解除禁言失败');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(null);
    }
  };

  // 踢出群成员
  const handleKick = async (userId: string, userName: string) => {
    if (!confirm(`确定要踢出成员「${userName}」吗？`)) {
      return;
    }

    setActionLoading(userId);
    try {
      const result = await api<{ success: boolean; error?: string }>(
        `/api/groups/${groupId}/members/${userId}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId })
        }
      );
      if (result.success) {
        alert('踢出成功');
        // 从列表中移除该成员
        setMembers((prev) => prev.filter((m) => m.id !== userId));
      } else {
        alert(result.error || '踢出失败');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(null);
    }
  };

  // 格式化禁言时长选项
  const durationOptions = [
    { label: '1分钟', value: '60' },
    { label: '5分钟', value: '300' },
    { label: '10分钟', value: '600' },
    { label: '30分钟', value: '1800' },
    { label: '1小时', value: '3600' },
    { label: '6小时', value: '21600' },
    { label: '12小时', value: '43200' },
    { label: '1天', value: '86400' },
    { label: '3天', value: '259200' },
    { label: '7天', value: '604800' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col m-4">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle>群管理 - {groupId}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            ×
          </Button>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto p-4">
          {!isConnected ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-destructive font-medium">平台未连接或账号不匹配</p>
              <p className="text-black text-sm mt-1">请先连接到对应账号的平台</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-black">加载中...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-destructive">{error}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={loadMembers}>
                重试
              </Button>
            </div>
          ) : members.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-black">暂无群成员数据</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-black">共 {members.length} 名成员</p>
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    {member.avatar ? (
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
                        👤
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="font-medium">{member.name}</span>
                      <span className="text-xs text-black">ID: {member.id}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={muteDuration[member.id] || '60'}
                      onChange={(e) => setMuteDuration({ ...muteDuration, [member.id]: e.target.value })}
                      disabled={actionLoading === member.id}
                      className="h-9 px-2 rounded-md border border-input bg-background text-sm"
                    >
                      {durationOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMute(member.id)}
                      disabled={actionLoading === member.id}
                    >
                      禁言
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnmute(member.id)}
                      disabled={actionLoading === member.id}
                    >
                      解禁
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleKick(member.id, member.name)}
                      disabled={actionLoading === member.id}
                    >
                      踢出
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
