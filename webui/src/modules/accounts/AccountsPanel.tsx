import { FormEvent } from 'react';
import { BotAccount } from '../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HelpTooltip, QuickTips, EmptyState, StatusBadge } from '@/components/ui/help-tooltip';

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
    <div className="flex-1 p-4 md:p-6 space-y-4 md:space-y-6 overflow-auto safe-area-inset-top">
      {/* 新手引导提示 */}
      {accounts.length === 0 && (
        <QuickTips
          tips={[
            '首先需要在 QQ 开放平台创建机器人应用，获取 App ID 和 App Secret',
            'App ID 和 App Secret 可以在 QQ 开放平台的「开发设置」中找到',
            '添加账号后，点击「启动」按钮连接机器人平台'
          ]}
          title="🚀 快速开始指南"
        />
      )}

      <Card>
        <CardHeader className="p-4 md:p-6">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base md:text-lg">添加新账号</CardTitle>
            <HelpTooltip content="添加 QQ 官方机器人账号，需要从 QQ 开放平台获取 App ID 和 App Secret" position="right" />
          </div>
          <CardDescription className="text-sm">配置 QQ 官方机器人账号信息</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
          <form onSubmit={onCreateAccount} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              <div className="space-y-1.5 md:space-y-2">
                <div className="flex items-center gap-1">
                  <label className="text-xs md:text-sm font-medium">账号名称</label>
                  <HelpTooltip content="给机器人起一个容易识别的名字，方便管理多个账号" position="top" />
                </div>
                <Input
                  value={newAccount.name}
                  onChange={(e) => onNewAccountChange({ ...newAccount, name: e.target.value })}
                  placeholder="例如：客服机器人"
                  required
                  className="text-sm md:text-base"
                />
              </div>
              <div className="space-y-1.5 md:space-y-2">
                <div className="flex items-center gap-1">
                  <label className="text-xs md:text-sm font-medium">App ID</label>
                  <HelpTooltip content="在 QQ 开放平台创建应用后获得，用于标识您的机器人" position="top" />
                </div>
                <Input
                  value={newAccount.appId}
                  onChange={(e) => onNewAccountChange({ ...newAccount, appId: e.target.value })}
                  placeholder="填 QQ 官方机器人 AppID"
                  required
                  className="text-sm md:text-base"
                />
              </div>
              <div className="space-y-1.5 md:space-y-2">
                <div className="flex items-center gap-1">
                  <label className="text-xs md:text-sm font-medium">App Secret</label>
                  <HelpTooltip content="机器人密钥，请妥善保管不要泄露" position="top" />
                </div>
                <Input
                  value={newAccount.appSecret}
                  onChange={(e) => onNewAccountChange({ ...newAccount, appSecret: e.target.value })}
                  placeholder="填 QQ 官方机器人密钥"
                  type="password"
                  required
                  className="text-sm md:text-base"
                />
              </div>
            </div>
            <Button type="submit" className="gap-2 w-full md:w-auto">
              <span>➕</span> 添加账号
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 md:p-6">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base md:text-lg">账号列表</CardTitle>
            <HelpTooltip content="管理已添加的机器人账号，点击账号可查看详情" position="right" />
          </div>
          <CardDescription className="text-sm">管理已配置的机器人账号</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
          {accounts.length === 0 ? (
            <EmptyState
              icon="🤖"
              title="还没有添加机器人账号"
              description="添加您的第一个 QQ 机器人账号，开始使用机器人功能"
            />
          ) : (
            <div className="space-y-2 md:space-y-3">
              {accounts.map((a) => (
                <div
                  key={a.id}
                  className={`flex items-center justify-between p-3 md:p-4 rounded-lg border transition-colors cursor-pointer active:scale-[0.98] md:hover:bg-accent ${
                    selectedAccountId === a.id ? 'bg-accent border-primary' : 'bg-card'
                  }`}
                  onClick={() => onSelectAccount(a.id)}
                >
                  <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium text-sm md:text-base shrink-0">
                      {a.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm md:text-base truncate">{a.name}</span>
                        <StatusBadge
                          status={a.status === 'ONLINE' ? 'success' : 'loading'}
                          text={a.status === 'ONLINE' ? '在线' : '离线'}
                          pulse={a.status === 'ONLINE'}
                        />
                      </div>
                      <span className="text-black text-xs md:text-sm truncate block">{a.appSecretMasked}</span>
                    </div>
                  </div>
                  <Button
                    variant={a.status === 'ONLINE' ? 'destructive' : 'default'}
                    size="sm"
                    className="shrink-0 ml-2 text-xs md:text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleAccount(a);
                    }}
                  >
                    {a.status === 'ONLINE' ? '⏹️ 停用' : '▶️ 启动'}
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
