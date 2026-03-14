import { FormEvent } from 'react';
import { BotAccount } from '../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Props = {
  accounts: BotAccount[];
  selectedAccountId: string;
  newAccount: { name: string; appId: string; appSecret: string };
  onNewAccountChange: (next: { name: string; appId: string; appSecret: string }) => void;
  onCreateAccount: (e: FormEvent) => void;
  onSelectAccount: (id: string) => void;
  onToggleAccount: (account: BotAccount) => void;
};

export function AccountsPanel({
  accounts,
  selectedAccountId,
  newAccount,
  onNewAccountChange,
  onCreateAccount,
  onSelectAccount,
  onToggleAccount
}: Props) {
  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      <Card>
        <CardHeader>
          <CardTitle>添加新账号</CardTitle>
          <CardDescription>配置 QQ 官方机器人账号信息</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreateAccount} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">账号名称</label>
              <Input
                value={newAccount.name}
                onChange={(e) => onNewAccountChange({ ...newAccount, name: e.target.value })}
                placeholder="例如：客服机器人"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">App ID</label>
              <Input
                value={newAccount.appId}
                onChange={(e) => onNewAccountChange({ ...newAccount, appId: e.target.value })}
                placeholder="填 QQ 官方机器人 AppID"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">App Secret</label>
              <Input
                value={newAccount.appSecret}
                onChange={(e) => onNewAccountChange({ ...newAccount, appSecret: e.target.value })}
                placeholder="填 QQ 官方机器人密钥"
                type="password"
                required
              />
            </div>
            <div className="md:col-span-3">
              <Button type="submit">添加账号</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>账号列表</CardTitle>
          <CardDescription>管理已配置的机器人账号</CardDescription>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">暂无账号，请先新增。</p>
          ) : (
            <div className="space-y-3">
              {accounts.map((a) => (
                <div
                  key={a.id}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors cursor-pointer hover:bg-accent ${
                    selectedAccountId === a.id ? 'bg-accent border-primary' : 'bg-card'
                  }`}
                  onClick={() => onSelectAccount(a.id)}
                >
                  <div className="flex items-center gap-4">
                    <span className="font-medium">{a.name}</span>
                    <Badge variant={a.status === 'ONLINE' ? 'success' : 'secondary'}>
                      {a.status}
                    </Badge>
                    <span className="text-muted-foreground text-sm">{a.appSecretMasked}</span>
                  </div>
                  <Button
                    variant={a.status === 'ONLINE' ? 'destructive' : 'default'}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleAccount(a);
                    }}
                  >
                    {a.status === 'ONLINE' ? '停用' : '启动'}
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
