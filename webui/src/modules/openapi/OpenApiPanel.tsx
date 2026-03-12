import { OpenApiTokenView } from '../../types';

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
    <section className="panel">
      <h2>开放 API</h2>
      <p className="muted">OpenAPI 状态：{enabled ? '启用' : '禁用'}</p>

      <div className="platform-actions">
        <input value={newTokenName} onChange={(e) => onTokenNameChange(e.target.value)} placeholder="Token 名称" />
        <button type="button" onClick={onCreateToken} disabled={!enabled}>
          新建 Token
        </button>
        <button type="button" onClick={onRefresh}>
          刷新
        </button>
      </div>

      <div className="list">
        {tokens.length === 0 && <p className="muted">暂无 Token</p>}
        {tokens.map((t) => (
          <div key={t.id} className="row">
            <span>{t.name}</span>
            <span className="muted">{t.tokenMasked}</span>
            <span className={`status ${t.enabled ? 'ok' : 'off'}`}>{t.enabled ? '启用' : '禁用'}</span>
            <button type="button" onClick={() => onToggleToken(t.id)}>
              {t.enabled ? '停用' : '启用'}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
