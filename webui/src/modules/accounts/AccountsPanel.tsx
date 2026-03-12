import { FormEvent } from 'react';
import { BotAccount } from '../../types';

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
    <section className="panel">
      <h2>账号管理</h2>
      <form onSubmit={onCreateAccount} className="form grid-3">
        <label>
          账号名称
          <input
            value={newAccount.name}
            onChange={(e) => onNewAccountChange({ ...newAccount, name: e.target.value })}
            placeholder="例如：客服机器人"
            required
          />
        </label>
        <label>
          App ID
          <input
            value={newAccount.appId}
            onChange={(e) => onNewAccountChange({ ...newAccount, appId: e.target.value })}
            placeholder="填 QQ 官方机器人 AppID"
            required
          />
        </label>
        <label>
          App Secret
          <input
            value={newAccount.appSecret}
            onChange={(e) => onNewAccountChange({ ...newAccount, appSecret: e.target.value })}
            placeholder="填 QQ 官方机器人密钥"
            required
          />
        </label>
        <button type="submit">添加账号</button>
      </form>

      <div className="list">
        {accounts.length === 0 && <p className="muted">暂无账号，请先新增。</p>}
        {accounts.map((a) => (
          <div key={a.id} className={`row ${selectedAccountId === a.id ? 'active' : ''}`}>
            <button className="link" onClick={() => onSelectAccount(a.id)} type="button">
              {a.name}
            </button>
            <span className={`status ${a.status === 'ONLINE' ? 'ok' : 'off'}`}>{a.status}</span>
            <span className="muted">{a.appSecretMasked}</span>
            <button onClick={() => onToggleAccount(a)} type="button">
              {a.status === 'ONLINE' ? '停用' : '启动'}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
