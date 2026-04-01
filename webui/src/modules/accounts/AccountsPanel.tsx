import { FormEvent, useMemo, useState } from 'react';
import { BotAccount } from '../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HelpTooltip, QuickTips, EmptyState, StatusBadge } from '@/components/ui/help-tooltip';

type OfficialAccountForm = { name: string; appId: string; appSecret: string };
type OneBotAccountForm = { name: string; selfId: string };

type Props = {
  accounts: BotAccount[];
  selectedAccountId: string;
  newAccount: OfficialAccountForm;
  newOneBotAccount: OneBotAccountForm;
  onNewAccountChange: (next: OfficialAccountForm) => void;
  onNewOneBotAccountChange: (next: OneBotAccountForm) => void;
  onCreateAccount: (e: FormEvent) => void;
  onCreateOneBotAccount: (e: FormEvent) => void;
  onSelectAccount: (id: string) => void;
  onToggleAccount: (account: BotAccount) => void;
};

export function AccountsPanel({
  accounts,
  selectedAccountId,
  newAccount,
  newOneBotAccount,
  onNewAccountChange,
  onNewOneBotAccountChange,
  onCreateAccount,
  onCreateOneBotAccount,
  onSelectAccount,
  onToggleAccount
}: Props) {
  const officialAccounts = useMemo(
    () => accounts.filter((account) => (account.platformType || 'qq_official') === 'qq_official'),
    [accounts]
  );

  const onebotAccounts = useMemo(
    () => accounts.filter((account) => account.platformType === 'onebot_v11'),
    [accounts]
  );

  const [createType, setCreateType] = useState<'qq_official' | 'onebot_v11'>('qq_official');

  const getStatusMeta = (account: BotAccount): { status: 'success' | 'warning' | 'loading'; text: string; pulse: boolean } => {
    if (account.status === 'ONLINE') {
      return { status: 'success', text: '在线', pulse: true };
    }

    if (account.status === 'CONNECTING') {
      return { status: 'warning', text: '连接中', pulse: true };
    }

    return { status: 'loading', text: account.status === 'DISABLED' ? '已停用' : '离线', pulse: false };
  };

  const renderAccountList = (items: BotAccount[], type: 'qq_official' | 'onebot_v11') => {
    if (items.length === 0) {
      return (
        <EmptyState
          icon={type === 'qq_official' ? '🤖' : '🔗'}
          title={type === 'qq_official' ? '暂无 QQ 官方账号' : '暂无 OneBot 账号'}
          description={type === 'qq_official' ? '添加 QQ 官方机器人账号后即可连接官方平台。' : '添加 OneBot 账号并创建 Token 后，即可让反向 WebSocket 客户端接入。'}
        />
      );
    }

    return (
      <div className="space-y-2 md:space-y-3">
        {items.map((a) => {
          const meta = getStatusMeta(a);
          return (
            <div
              key={a.id}
              className={`flex items-center justify-between p-3 md:p-4 rounded-lg border transition-colors cursor-pointer active:scale-[0.98] md:hover:bg-accent ${
                selectedAccountId === a.id ? 'bg-accent border-primary' : 'bg-card'
              }`}
              onClick={() => onSelectAccount(a.id)}
            >
              <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                <div className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-white font-medium text-sm md:text-base shrink-0 ${
                  type === 'qq_official' ? 'bg-gradient-to-br from-blue-400 to-blue-600' : 'bg-gradient-to-br from-purple-400 to-fuchsia-600'
                }`}>
                  {a.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm md:text-base truncate">{a.name}</span>
                    <Badge variant={type === 'qq_official' ? 'secondary' : 'outline'}>
                      {type === 'qq_official' ? 'QQ 官方' : 'OneBot v11'}
                    </Badge>
                    <StatusBadge status={meta.status} text={meta.text} pulse={meta.pulse} />
                  </div>
                  <span className="text-black text-xs md:text-sm truncate block">
                    {type === 'qq_official'
                      ? `AppSecret: ${a.appSecretMasked || '-'}`
                      : `Self ID: ${a.onebotSelfId || '-'}`}
                  </span>
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
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 p-4 md:p-6 space-y-4 md:space-y-6 overflow-auto safe-area-inset-top">
      {accounts.length === 0 && (
        <QuickTips
          tips={[
            '如果使用 QQ 官方机器人，请准备 App ID 和 App Secret',
            '如果使用 OneBot v11 反向 WebSocket，请先添加 OneBot 账号并记录 Self ID',
            '添加账号后，QQ 官方账号可直接启动；OneBot 账号需额外创建 Token 给客户端使用'
          ]}
          title="🚀 快速开始指南"
        />
      )}

      <Card>
        <CardHeader className="p-4 md:p-6">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base md:text-lg">添加新账号</CardTitle>
            <HelpTooltip content="支持添加 QQ 官方机器人账号与 OneBot v11 反向 WebSocket 账号。" position="right" />
          </div>
          <CardDescription className="text-sm">按接入方式分别创建机器人账号</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 md:pt-0 space-y-4">
          <div className="inline-flex rounded-lg border p-1 bg-muted/40">
            <button
              type="button"
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                createType === 'qq_official' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
              }`}
              onClick={() => setCreateType('qq_official')}
            >
              QQ 官方账号
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                createType === 'onebot_v11' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
              }`}
              onClick={() => setCreateType('onebot_v11')}
            >
              OneBot v11 账号
            </button>
          </div>

          {createType === 'qq_official' ? (
            <form onSubmit={onCreateAccount} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                <div className="space-y-1.5 md:space-y-2">
                  <div className="flex items-center gap-1">
                    <label className="text-xs md:text-sm font-medium">账号名称</label>
                    <HelpTooltip content="给 QQ 官方机器人起一个容易识别的名字，方便管理多个账号。" position="top" />
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
                    <HelpTooltip content="在 QQ 开放平台创建应用后获得，用于标识您的机器人。" position="top" />
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
                    <HelpTooltip content="机器人密钥，请妥善保管不要泄露。" position="top" />
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
                <span>➕</span> 添加 QQ 官方账号
              </Button>
            </form>
          ) : (
            <form onSubmit={onCreateOneBotAccount} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-1.5 md:space-y-2">
                  <div className="flex items-center gap-1">
                    <label className="text-xs md:text-sm font-medium">账号名称</label>
                    <HelpTooltip content="给 OneBot 账号起一个名称，便于和 QQ 官方账号区分。" position="top" />
                  </div>
                  <Input
                    value={newOneBotAccount.name}
                    onChange={(e) => onNewOneBotAccountChange({ ...newOneBotAccount, name: e.target.value })}
                    placeholder="例如：NapCat 主号"
                    required
                    className="text-sm md:text-base"
                  />
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <div className="flex items-center gap-1">
                    <label className="text-xs md:text-sm font-medium">Self ID</label>
                    <HelpTooltip content="填写 OneBot 客户端上报的机器人 QQ 号或实例标识，用于账号绑定。" position="top" />
                  </div>
                  <Input
                    value={newOneBotAccount.selfId}
                    onChange={(e) => onNewOneBotAccountChange({ ...newOneBotAccount, selfId: e.target.value })}
                    placeholder="例如：123456789"
                    required
                    className="text-sm md:text-base"
                  />
                </div>
              </div>
              <Button type="submit" className="gap-2 w-full md:w-auto">
                <span>➕</span> 添加 OneBot 账号
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 md:p-6">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base md:text-lg">QQ 官方账号</CardTitle>
            <HelpTooltip content="用于连接 QQ 官方机器人平台，启动后会自动发起平台连接。" position="right" />
          </div>
          <CardDescription className="text-sm">管理已配置的 QQ 官方机器人账号</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
          {renderAccountList(officialAccounts, 'qq_official')}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 md:p-6">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base md:text-lg">OneBot v11 账号</CardTitle>
            <HelpTooltip content="用于反向 WebSocket 接入。启动账号仅表示启用接入，真正在线状态取决于客户端是否已连接。" position="right" />
          </div>
          <CardDescription className="text-sm">管理反向 WebSocket 方式接入的 OneBot 账号</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
          {renderAccountList(onebotAccounts, 'onebot_v11')}
        </CardContent>
      </Card>
    </div>
  );
}
