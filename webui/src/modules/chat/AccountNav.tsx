import { BotAccount } from '../../types';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';

type Props = {
  accounts: BotAccount[];
  selectedAccountId: string | null;
  onSelectAccount: (accountId: string | null) => void;
  platformConnectedId: string | null;
};

export function AccountNav({
  accounts,
  selectedAccountId,
  onSelectAccount,
  platformConnectedId
}: Props) {
  return (
    <aside className="w-56 border-r bg-card flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm text-muted-foreground">账号</h3>
      </div>
      
      <div className="flex-1 overflow-auto p-2 space-y-1">
        {/* 全部账号选项 */}
        <Button
          variant={selectedAccountId === null ? 'secondary' : 'ghost'}
          className={cn(
            "w-full justify-start gap-3 h-auto py-2 px-3",
            selectedAccountId === null && "bg-secondary"
          )}
          onClick={() => onSelectAccount(null)}
        >
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
            全
          </div>
          <div className="flex flex-col items-start text-left">
            <span className="text-sm font-medium">全部会话</span>
            <span className="text-xs text-muted-foreground">聚合显示</span>
          </div>
        </Button>
        
        {/* 账号列表 */}
        {accounts.map((account) => {
          const isConnected = platformConnectedId === account.id;
          const isSelected = selectedAccountId === account.id;
          
          return (
            <Button
              key={account.id}
              variant={isSelected ? 'secondary' : 'ghost'}
              className={cn(
                "w-full justify-start gap-3 h-auto py-2 px-3",
                isSelected && "bg-secondary"
              )}
              onClick={() => onSelectAccount(account.id)}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm",
                isConnected ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-muted text-muted-foreground"
              )}>
                {account.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col items-start text-left flex-1 min-w-0">
                <span className="text-sm font-medium truncate">{account.name}</span>
                <span className="text-xs text-muted-foreground">
                  {isConnected ? '在线' : account.status === 'DISABLED' ? '已禁用' : '离线'}
                </span>
              </div>
              {isConnected && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-800 text-xs px-1.5">
                  ●
                </Badge>
              )}
            </Button>
          );
        })}
      </div>
    </aside>
  );
}
