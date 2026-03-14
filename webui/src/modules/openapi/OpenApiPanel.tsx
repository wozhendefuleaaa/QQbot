import { OpenApiTokenView } from '../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Props = {
  enabled: boolean;
  tokens: OpenApiTokenView[];
  newTokenName: string;
  onTokenNameChange: (name: string) => void;
  onCreateToken: () => void;
  onToggleToken: (id: string) => void;
  onRefresh: () => void;
};

export function OpenApiPanel({
  enabled,
  tokens,
  newTokenName,
  onTokenNameChange,
  onCreateToken,
  onToggleToken,
  onRefresh
}: Props) {
  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      <Card>
        <CardHeader>
          <CardTitle>开放 API</CardTitle>
          <CardDescription>
            管理 OpenAPI Token，用于第三方系统集成
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">OpenAPI 状态：</span>
            <Badge variant={enabled ? 'success' : 'secondary'}>
              {enabled ? '启用' : '禁用'}
            </Badge>
          </div>

          <div className="flex gap-3">
            <Input
              value={newTokenName}
              onChange={(e) => onTokenNameChange(e.target.value)}
              placeholder="Token 名称"
              className="max-w-xs"
            />
            <Button onClick={onCreateToken} disabled={!enabled}>
              新建 Token
            </Button>
            <Button variant="outline" onClick={onRefresh}>
              刷新
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Token 列表</CardTitle>
          <CardDescription>管理已创建的 API Token</CardDescription>
        </CardHeader>
        <CardContent>
          {tokens.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">暂无 Token</p>
          ) : (
            <div className="space-y-3">
              {tokens.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-medium">{t.name}</span>
                    <span className="text-muted-foreground text-sm font-mono">{t.tokenMasked}</span>
                    <Badge variant={t.enabled ? 'success' : 'secondary'}>
                      {t.enabled ? '启用' : '禁用'}
                    </Badge>
                  </div>
                  <Button
                    variant={t.enabled ? 'destructive' : 'default'}
                    size="sm"
                    onClick={() => onToggleToken(t.id)}
                  >
                    {t.enabled ? '停用' : '启用'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
