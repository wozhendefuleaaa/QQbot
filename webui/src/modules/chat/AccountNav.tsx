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
    <aside className="w-48 lg:w-56 xl:w-64 min-w-[180px] max-w-[280px] border-r bg-gradient-to-b from-card to-muted/10 flex flex-col shrink-0">
      <div className="p-3 lg:p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm lg:text-base">📱 账号</h3>
          <Badge variant="secondary" className="text-xs">
            {onlineCount}/{accounts.length} 在线
          </Badge>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-1.5 lg:p-2 space-y-1">
        {/* 全部账号选项 */}
        <Button
          variant={selectedAccountId === null ? 'secondary' : 'ghost'}
          className={cn(
            "w-full justify-start gap-2 lg:gap-3 h-auto py-2 lg:py-3 px-2 lg:px-3 rounded-xl transition-all duration-200",
            selectedAccountId === null && "bg-primary/10 ring-2 ring-primary/30"
          )}
          onClick={() => onSelectAccount(null)}
        >
          <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-white font-medium text-xs lg:text-sm shadow-sm shrink-0">
            📋
          </div>
          <div className="flex flex-col items-start text-left min-w-0">
            <span className="text-xs lg:text-sm font-medium truncate">全部会话</span>
            <span className="text-[10px] lg:text-xs text-black truncate">聚合所有账号</span>
          </div>
        </Button>
        
        {/* 分隔线 */}
        <div className="my-2 lg:my-3 border-t" />
        
        {/* 账号列表标题 */}
        <div className="px-2 lg:px-3 py-1.5 text-[10px] lg:text-xs text-black font-medium">
          机器人账号
        </div>
        
        {/* 账号列表 */}
        {accounts.length === 0 ? (
          <div className="text-center py-6 lg:py-8 text-black">
            <div className="text-2xl lg:text-3xl mb-2">🤖</div>
            <p className="text-xs lg:text-sm">暂无账号</p>
            <p className="text-[10px] lg:text-xs mt-1">请先添加机器人账号</p>
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
                  "w-full justify-start gap-2 lg:gap-3 h-auto py-2 lg:py-3 px-2 lg:px-3 rounded-xl transition-all duration-200",
                  isSelected && "bg-primary/10 ring-2 ring-primary/30"
                )}
                onClick={() => onSelectAccount(account.id)}
              >
                <div className="relative shrink-0">
                  <div className={cn(
                    "w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center font-medium text-xs lg:text-sm shadow-sm",
                    isConnected
                      ? "bg-gradient-to-br from-green-400 to-green-600 text-white"
                      : "bg-gradient-to-br from-gray-300 to-gray-400 text-white dark:from-gray-600 dark:to-gray-700"
                  )}>
                    {account.name.charAt(0).toUpperCase()}
                  </div>
                  {/* 在线状态指示器 */}
                  <span className={cn(
                    "absolute bottom-0 right-0 w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full border-2 border-card",
                    isConnected ? "bg-green-500" : "bg-gray-400"
                  )} />
                </div>
                <div className="flex flex-col items-start text-left flex-1 min-w-0">
                  <span className="text-xs lg:text-sm font-medium truncate">{account.name}</span>
                  <span className={cn(
                    "text-[10px] lg:text-xs truncate",
                    isConnected ? "text-green-600 dark:text-green-400" : "text-black"
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
      <div className="p-2 lg:p-3 border-t bg-muted/20">
        <p className="text-[10px] lg:text-xs text-black text-center">
          💡 点击账号筛选会话
        </p>
      </div>
    </aside>
  );
}
