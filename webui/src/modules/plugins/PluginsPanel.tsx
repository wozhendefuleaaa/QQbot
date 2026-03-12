import { FormEvent } from 'react';
import { PluginInfo } from '../../types';

type Props = {
  plugins: PluginInfo[];
  newPlugin: { name: string; description: string; version: string };
  onNewPluginChange: (next: { name: string; description: string; version: string }) => void;
  onCreatePlugin: (e: FormEvent) => void;
  onTogglePlugin: (id: string) => void;
};

export function PluginsPanel({ plugins, newPlugin, onNewPluginChange, onCreatePlugin, onTogglePlugin }: Props) {
  return (
    <section className="panel">
      <h2>插件中心</h2>
      <form className="form grid-3" onSubmit={onCreatePlugin}>
        <label>
          插件名称
          <input value={newPlugin.name} onChange={(e) => onNewPluginChange({ ...newPlugin, name: e.target.value })} required />
        </label>
        <label>
          版本
          <input value={newPlugin.version} onChange={(e) => onNewPluginChange({ ...newPlugin, version: e.target.value })} />
        </label>
        <label>
          描述
          <input
            value={newPlugin.description}
            onChange={(e) => onNewPluginChange({ ...newPlugin, description: e.target.value })}
          />
        </label>
        <button type="submit">创建插件</button>
      </form>

      <div className="list">
        {plugins.length === 0 && <p className="muted">暂无插件</p>}
        {plugins.map((p) => (
          <div key={p.id} className="row">
            <span>{p.name}</span>
            <span className="muted">{p.version}</span>
            <span className={`status ${p.enabled ? 'ok' : 'off'}`}>{p.enabled ? '启用' : '停用'}</span>
            <button type="button" onClick={() => onTogglePlugin(p.id)}>
              {p.enabled ? '停用' : '启用'}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
