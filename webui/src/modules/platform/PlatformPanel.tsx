import { PlatformLog, PlatformStatus } from '../../types';
import { fmtTime } from '../../services/api';

type Props = {
  platformStatus: PlatformStatus;
  platformLogs: PlatformLog[];
  onConnect: () => void;
  onDisconnect: () => void;
  onRefresh: () => void;
};

export function PlatformPanel({ platformStatus, platformLogs, onConnect, onDisconnect, onRefresh }: Props) {
  return (
    <section className="panel">
      <h2>QQ 平台连接</h2>
      <div className="platform-actions">
        <button type="button" onClick={onConnect}>
          连接 QQ 平台
        </button>
        <button type="button" onClick={onDisconnect}>
          断开连接
        </button>
        <button type="button" onClick={onRefresh}>
          刷新状态
        </button>
      </div>

      <div className="kv">
        <div>
          <span className="muted">连接状态</span>
          <strong>{platformStatus.connected ? '已连接' : platformStatus.connecting ? '连接中' : '未连接'}</strong>
        </div>
        <div>
          <span className="muted">已连接账号</span>
          <strong>{platformStatus.connectedAccountName || '-'}</strong>
        </div>
        <div>
          <span className="muted">最近连接时间</span>
          <strong>{fmtTime(platformStatus.lastConnectedAt)}</strong>
        </div>
        <div>
          <span className="muted">Token 过期时间</span>
          <strong>{fmtTime(platformStatus.tokenExpiresAt)}</strong>
        </div>
        <div>
          <span className="muted">最近错误</span>
          <strong>{platformStatus.lastError || '-'}</strong>
        </div>
      </div>

      <h3>平台日志</h3>
      <div className="logbox">
        {platformLogs.length === 0 && <p className="muted">暂无日志</p>}
        {platformLogs.map((log) => (
          <div key={log.id} className={`log-item ${log.level.toLowerCase()}`}>
            <span>[{log.level}]</span>
            <span>{fmtTime(log.createdAt)}</span>
            <span>{log.message}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
