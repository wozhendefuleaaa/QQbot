import { Package, Power, Terminal } from 'lucide-react';

type PluginStatsProps = {
  total: number;
  enabled: number;
  loaded: number;
};

export function PluginStats({ total, enabled, loaded }: PluginStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="p-4 rounded-lg border bg-card flex items-center gap-4">
        <div className="p-3 rounded-full bg-blue-500/10">
          <Package className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <p className="text-sm text-black">总插件数</p>
          <p className="text-2xl font-semibold">{total}</p>
        </div>
      </div>
      <div className="p-4 rounded-lg border bg-card flex items-center gap-4">
        <div className="p-3 rounded-full bg-green-500/10">
          <Power className="w-5 h-5 text-green-500" />
        </div>
        <div>
          <p className="text-sm text-black">已启用</p>
          <p className="text-2xl font-semibold">{enabled}</p>
        </div>
      </div>
      <div className="p-4 rounded-lg border bg-card flex items-center gap-4">
        <div className="p-3 rounded-full bg-purple-500/10">
          <Terminal className="w-5 h-5 text-purple-500" />
        </div>
        <div>
          <p className="text-sm text-black">已加载</p>
          <p className="text-2xl font-semibold">{loaded}</p>
        </div>
      </div>
    </div>
  );
}
