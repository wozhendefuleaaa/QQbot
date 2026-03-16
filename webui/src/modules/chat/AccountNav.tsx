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
  // 统计在线账号数量
  const onlineCount = accounts.filter(a => platformConnectedId === a.id).length;
  
  return (
    <aside className="w-64 border-r bg-gradient-to-b from-card to-muted/10 flex flex-col">
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base">📱 账号</h3>
          <Badge variant="secondary" className="text-xs">
            {onlineCount}/{accounts.length} 在线
          </Badge>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-2 space-y-1">
        {/* 全部账号选项 */}
        <Button
          variant={selectedAccountId === null ? 'secondary' : 'ghost'}
          className={cn(
            "w-full justify-start gap-3 h-auto py-3 px-3 rounded-xl transition-all",
            selectedAccountId === null && "bg-primary/10 ring-2 ring-primary/30"
          )}
          onClick={() => onSelectAccount(null)}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-white font-medium text-sm shadow-sm">
            📋
          </div>
          <div className="flex flex-col items-start text-left">
            <span className="text-sm font-medium">全部会话</span>
            <span className="text-xs text-muted-foreground">聚合所有账号</span>
          </div>
        </Button>
        
        {/* 分隔线 */}
        <div className="my-3 border-t" />
        
        {/* 账号列表标题 */}
        <div className="px-3 py-1.5 text-xs text-muted-foreground font-medium">
          机器人账号
        </div>
        
        {/* 账号列表 */}
        {accounts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-3xl mb-2">🤖</div>
            <p className="text-sm">暂无账号</p>
            <p className="text-xs mt-1">请先添加机器人账号</p>
          </div>
        ) : (
          accounts.map((account) => {
            const isConnected = platformConnectedId === account.id;
            const isSelected = selectedAccountId === account.id;
            
            return (
              <Button
                key={account.id}
                variant={isSelected ? 'secondary' : 'ghost'}
                className={cn(
                  "w-full justify-start gap-3 h-auto py-3 px-3 rounded-xl transition-all",
                  isSelected && "bg-primary/10 ring-2 ring-primary/30"
                )}
                onClick={() => onSelectAccount(account.id)}
              >
                <div className="relative">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm shadow-sm",
                    isConnected
                      ? "bg-gradient-to-br from-green-400 to-green-600 text-white"
                      : "bg-gradient-to-br from-gray-300 to-gray-400 text-white dark:from-gray-600 dark:to-gray-700"
                  )}>
                    {account.name.charAt(0).toUpperCase()}
                  </div>
                  {/* 在线状态指示器 */}
                  <span className={cn(
                    "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card",
                    isConnected ? "bg-green-500" : "bg-gray-400"
                  )} />
                </div>
                <div className="flex flex-col items-start text-left flex-1 min-w-0">
                  <span className="text-sm font-medium truncate">{account.name}</span>
                  <span className={cn(
                    "text-xs",
                    isConnected ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                  )}>
                    {isConnected ? '🟢 在线' : account.status === 'DISABLED' ? '⏸️ 已禁用' : '⚪ 离线'}
                  </span>
                </div>
              </Button>
            );
          })
        )}
      </div>
      
      {/* 底部提示 */}
      <div className="p-3 border-t bg-muted/20">
        <p className="text-xs text-muted-foreground text-center">
          💡 点击账号筛选会话
        </p>
      </div>
    </aside>
  );
}
