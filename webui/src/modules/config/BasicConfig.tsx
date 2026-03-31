import { FormEvent } from 'react';
import { AppConfig } from '../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface Props {
  config: AppConfig;
  onChange: (next: AppConfig) => void;
  onSave: (e: FormEvent) => void;
  loading: boolean;
}

export function BasicConfig({ config, onChange, onSave, loading }: Props) {
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    await onSave(e);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>基础配置</CardTitle>
        <CardDescription>管理系统基础配置参数</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">控制台名称</label>
              <Input
                value={config.webName}
                onChange={(e) => onChange({ ...config, webName: e.target.value })}
                required
                placeholder="请输入控制台名称"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">系统公告</label>
              <Input
                value={config.notice}
                onChange={(e) => onChange({ ...config, notice: e.target.value })}
                placeholder="请输入系统公告"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">默认 Intents</label>
              <Input
                type="number"
                min={0}
                value={config.defaultIntent}
                onChange={(e) => onChange({ ...config, defaultIntent: Number(e.target.value || 0) })}
                required
                placeholder="请输入默认 Intents"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="allowOpenApi"
              checked={config.allowOpenApi}
              onChange={(e) => onChange({ ...config, allowOpenApi: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="allowOpenApi" className="text-sm font-medium cursor-pointer text-gray-700 dark:text-gray-200">
              启用 OpenAPI
            </label>
          </div>

          <Button type="submit" disabled={loading}>
            保存配置
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
