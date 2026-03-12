import { BotAccount } from '../../types';

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
    <aside className="account-nav">
      <div className="account-nav-header">
        <h3>账号</h3>
      </div>
      
      <div className="account-nav-list">
        {/* 全部账号选项 */}
        <button
          className={`account-nav-item ${selectedAccountId === null ? 'active' : ''}`}
          onClick={() => onSelectAccount(null)}
          type="button"
        >
          <div className="account-icon all">
            <span>全</span>
          </div>
          <div className="account-info">
            <span className="account-name">全部会话</span>
            <span className="account-status">聚合显示</span>
          </div>
        </button>
        
        {/* 账号列表 */}
        {accounts.map((account) => {
          const isConnected = platformConnectedId === account.id;
          const isSelected = selectedAccountId === account.id;
          
          return (
            <button
              key={account.id}
              className={`account-nav-item ${isSelected ? 'active' : ''}`}
              onClick={() => onSelectAccount(account.id)}
              type="button"
            >
              <div className={`account-icon ${isConnected ? 'online' : 'offline'}`}>
                <span>{account.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="account-info">
                <span className="account-name">{account.name}</span>
                <span className="account-status">
                  {isConnected ? '在线' : account.status === 'DISABLED' ? '已禁用' : '离线'}
                </span>
              </div>
              {isConnected && (
                <span className="account-badge online" title="已连接">●</span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
