import { FormEvent } from 'react';
import { AppConfig } from '../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type Props = {
  config: AppConfig;
  onChange: (next: AppConfig) => void;
  onSave: (e: FormEvent) => void;
};

export function ConfigPanel({ config, onChange, onSave }: Props) {
  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      <Card>
        <CardHeader>
          <CardTitle>配置中心</CardTitle>
          <CardDescription>管理系统配置参数</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">控制台名称</label>
                <Input
                  value={config.webName}
                  onChange={(e) => onChange({ ...config, webName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">系统公告</label>
                <Input
                  value={config.notice}
                  onChange={(e) => onChange({ ...config, notice: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">默认 Intents</label>
                <Input
                  type="number"
                  min={0}
                  value={config.defaultIntent}
                  onChange={(e) => onChange({ ...config, defaultIntent: Number(e.target.value || 0) })}
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="allowOpenApi"
                checked={config.allowOpenApi}
                onChange={(e) => onChange({ ...config, allowOpenApi: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="allowOpenApi" className="text-sm font-medium cursor-pointer">
                启用 OpenAPI
              </label>
            </div>

            <Button type="submit">保存配置</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
