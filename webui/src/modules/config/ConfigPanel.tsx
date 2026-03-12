import { FormEvent } from 'react';
import { AppConfig } from '../../types';

type Props = {
  config: AppConfig;
  onChange: (next: AppConfig) => void;
  onSave: (e: FormEvent) => void;
};

export function ConfigPanel({ config, onChange, onSave }: Props) {
  return (
    <section className="panel">
      <h2>配置中心</h2>
      <form className="form grid-3" onSubmit={onSave}>
        <label>
          控制台名称
          <input value={config.webName} onChange={(e) => onChange({ ...config, webName: e.target.value })} required />
        </label>
        <label>
          系统公告
          <input value={config.notice} onChange={(e) => onChange({ ...config, notice: e.target.value })} required />
        </label>
        <label>
          默认 Intents
          <input
            type="number"
            min={0}
            value={config.defaultIntent}
            onChange={(e) => onChange({ ...config, defaultIntent: Number(e.target.value || 0) })}
            required
          />
        </label>

        <label>
          <input
            type="checkbox"
            checked={config.allowOpenApi}
            onChange={(e) => onChange({ ...config, allowOpenApi: e.target.checked })}
          />
          启用 OpenAPI
        </label>

        <button type="submit">保存配置</button>
      </form>
    </section>
  );
}
