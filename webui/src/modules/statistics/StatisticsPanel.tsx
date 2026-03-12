import { StatisticsSnapshot } from '../../types';

type Props = {
  snapshot: StatisticsSnapshot | null;
  onRefresh: () => void;
};

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时${Math.floor((seconds % 3600) / 60)}分钟`;
  return `${Math.floor(seconds / 86400)}天${Math.floor((seconds % 86400) / 3600)}小时`;
}

export function StatisticsPanel({ snapshot, onRefresh }: Props) {
  return (
    <section className="panel">
      <h2>统计中心</h2>
      <div className="platform-actions">
        <button type="button" onClick={onRefresh}>
          刷新统计
        </button>
      </div>
      {!snapshot ? (
        <p className="muted">暂无统计数据</p>
      ) : (
        <div className="statistics-content">
          {/* 概览卡片 */}
          <div className="stats-section">
            <h3>概览</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">日期</span>
                <strong className="stat-value">{snapshot.date}</strong>
              </div>
              <div className="stat-card">
                <span className="stat-label">在线账号</span>
                <strong className="stat-value">{snapshot.activeAccounts} / {snapshot.totalAccounts}</strong>
              </div>
              <div className="stat-card">
                <span className="stat-label">会话总数</span>
                <strong className="stat-value">{snapshot.conversations}</strong>
              </div>
              <div className="stat-card">
                <span className="stat-label">平台状态</span>
                <strong className={`stat-value ${snapshot.platformConnected ? 'status-ok' : 'status-error'}`}>
                  {snapshot.platformConnected ? '已连接' : '未连接'}
                </strong>
              </div>
            </div>
          </div>

          {/* 消息统计 */}
          <div className="stats-section">
            <h3>消息统计</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">入站消息</span>
                <strong className="stat-value">{snapshot.inboundMessages}</strong>
              </div>
              <div className="stat-card">
                <span className="stat-label">出站消息</span>
                <strong className="stat-value">{snapshot.outboundMessages}</strong>
              </div>
              <div className="stat-card">
                <span className="stat-label">私聊会话</span>
                <strong className="stat-value">{snapshot.privateConversations}</strong>
              </div>
              <div className="stat-card">
                <span className="stat-label">群聊会话</span>
                <strong className="stat-value">{snapshot.groupConversations}</strong>
              </div>
            </div>
          </div>

          {/* 运行状态 */}
          <div className="stats-section">
            <h3>运行状态</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">平台运行时间</span>
                <strong className="stat-value">{snapshot.platformUptime > 0 ? formatUptime(snapshot.platformUptime) : '-'}</strong>
              </div>
              <div className="stat-card">
                <span className="stat-label">快捷回复</span>
                <strong className="stat-value">{snapshot.quickReplies}</strong>
              </div>
              <div className="stat-card">
                <span className="stat-label">插件数量</span>
                <strong className="stat-value">{snapshot.plugins}</strong>
              </div>
            </div>
          </div>

          {/* 活跃排行 */}
          <div className="stats-section">
            <h3>活跃排行</h3>
            <div className="stats-columns">
              <div className="stats-column">
                <h4>活跃群组 Top 5</h4>
                {snapshot.topGroups.length === 0 ? (
                  <p className="muted">暂无数据</p>
                ) : (
                  <ul className="rank-list">
                    {snapshot.topGroups.map((g, i) => (
                      <li key={g.id}>
                        <span className="rank">{i + 1}</span>
                        <span className="name">{g.name}</span>
                        <span className="count">{g.messageCount} 条</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="stats-column">
                <h4>活跃用户 Top 5</h4>
                {snapshot.topUsers.length === 0 ? (
                  <p className="muted">暂无数据</p>
                ) : (
                  <ul className="rank-list">
                    {snapshot.topUsers.map((u, i) => (
                      <li key={u.id}>
                        <span className="rank">{i + 1}</span>
                        <span className="name">{u.name}</span>
                        <span className="count">{u.messageCount} 条</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
