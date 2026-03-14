import { fmtTime } from '../../services/api';
import { SystemLog } from '../../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type Props = {
  logs: SystemLog[];
  logType: 'all' | 'framework' | 'plugin' | 'openapi' | 'config';
  onChangeType: (next: 'all' | 'framework' | 'plugin' | 'openapi' | 'config') => void;
  onRefresh: () => void;
};

export function LogsPanel({ logs, logType, onChangeType, onRefresh }: Props) {
  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>日志中心</CardTitle>
            <CardDescription>查看系统运行日志</CardDescription>
          </div>
          <div className="flex gap-3">
            <select
              value={logType}
              onChange={(e) => onChangeType(e.target.value as Props['logType'])}
              className="px-3 py-2 rounded-md border bg-background text-sm"
            >
              <option value="all">全部</option>
              <option value="framework">框架</option>
              <option value="plugin">插件</option>
              <option value="openapi">OpenAPI</option>
              <option value="config">配置</option>
            </select>
            <Button variant="outline" onClick={onRefresh}>刷新日志</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4 max-h-[600px] overflow-auto font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">暂无日志</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex gap-2 ${
                      log.level === 'ERROR' ? 'text-destructive' :
                      log.level === 'WARN' ? 'text-yellow-600' :
                      log.level === 'INFO' ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    <span className="font-semibold">[{log.level}]</span>
                    <span className="text-muted-foreground">{fmtTime(log.createdAt)}</span>
                    <span>
                      <span className="text-secondary-foreground">[{log.category}]</span> {log.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
