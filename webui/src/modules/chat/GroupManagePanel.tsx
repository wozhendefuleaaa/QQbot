import { useEffect, useState } from 'react';
import { api } from '../../services/api';

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
    <div className="group-manage-overlay">
      <div className="group-manage-panel">
        <div className="panel-header">
          <h3>群管理 - {groupId}</h3>
          <button type="button" className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="panel-body">
          {!isConnected ? (
            <div className="error-message">
              <p>平台未连接或账号不匹配</p>
              <p className="muted">请先连接到对应账号的平台</p>
            </div>
          ) : loading ? (
            <div className="loading">加载中...</div>
          ) : error ? (
            <div className="error-message">
              <p>{error}</p>
              <button type="button" onClick={loadMembers}>重试</button>
            </div>
          ) : members.length === 0 ? (
            <div className="empty-message">
              <p>暂无群成员数据</p>
            </div>
          ) : (
            <div className="member-list">
              <div className="member-count">共 {members.length} 名成员</div>
              {members.map((member) => (
                <div key={member.id} className="member-item">
                  <div className="member-info">
                    {member.avatar ? (
                      <img src={member.avatar} alt={member.name} className="member-avatar" />
                    ) : (
                      <div className="member-avatar placeholder">👤</div>
                    )}
                    <div className="member-details">
                      <span className="member-name">{member.name}</span>
                      <span className="member-id muted">ID: {member.id}</span>
                    </div>
                  </div>
                  <div className="member-actions">
                    <select
                      value={muteDuration[member.id] || '60'}
                      onChange={(e) => setMuteDuration({ ...muteDuration, [member.id]: e.target.value })}
                      disabled={actionLoading === member.id}
                    >
                      {durationOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn-mute"
                      onClick={() => handleMute(member.id)}
                      disabled={actionLoading === member.id}
                    >
                      禁言
                    </button>
                    <button
                      type="button"
                      className="btn-unmute"
                      onClick={() => handleUnmute(member.id)}
                      disabled={actionLoading === member.id}
                    >
                      解禁
                    </button>
                    <button
                      type="button"
                      className="btn-kick"
                      onClick={() => handleKick(member.id, member.name)}
                      disabled={actionLoading === member.id}
                    >
                      踢出
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
