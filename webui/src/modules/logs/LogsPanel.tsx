import { fmtTime } from '../../services/api';
import { SystemLog } from '../../types';

type Props = {
  logs: SystemLog[];
  logType: 'all' | 'framework' | 'plugin' | 'openapi' | 'config';
  onChangeType: (next: 'all' | 'framework' | 'plugin' | 'openapi' | 'config') => void;
  onRefresh: () => void;
};

export function LogsPanel({ logs, logType, onChangeType, onRefresh }: Props) {
  return (
    <section className="panel">
      <h2>日志中心</h2>
      <div className="platform-actions">
        <select value={logType} onChange={(e) => onChangeType(e.target.value as Props['logType'])}>
          <option value="all">全部</option>
          <option value="framework">框架</option>
          <option value="plugin">插件</option>
          <option value="openapi">OpenAPI</option>
          <option value="config">配置</option>
        </select>
        <button type="button" onClick={onRefresh}>
          刷新日志
        </button>
      </div>
      <div className="logbox">
        {logs.length === 0 && <p className="muted">暂无日志</p>}
        {logs.map((log) => (
          <div key={log.id} className={`log-item ${log.level.toLowerCase()}`}>
            <span>[{log.level}]</span>
            <span>{fmtTime(log.createdAt)}</span>
            <span>
              [{log.category}] {log.message}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
