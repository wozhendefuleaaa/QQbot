import { FormEvent, useState } from 'react';
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!config.webName.trim()) {
      newErrors.webName = '控制台名称不能为空';
    }
    
    if (config.defaultIntent < 0) {
      newErrors.defaultIntent = '默认 Intents 不能为负数';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      await onSave(e);
    }
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
              <label htmlFor="webName" className="text-sm font-medium text-gray-700 dark:text-gray-200">控制台名称</label>
              <Input
                id="webName"
                value={config.webName}
                onChange={(e) => {
                  onChange({ ...config, webName: e.target.value });
                  if (errors.webName) {
                    setErrors({ ...errors, webName: '' });
                  }
                }}
                required
                placeholder="例如：机器人控制台..."
                autoComplete="off"
                aria-describedby={errors.webName ? 'webName-error' : undefined}
              />
              {errors.webName && (
                <p id="webName-error" className="text-xs text-red-600 dark:text-red-400">{errors.webName}</p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="notice" className="text-sm font-medium text-gray-700 dark:text-gray-200">系统公告</label>
              <Input
                id="notice"
                value={config.notice}
                onChange={(e) => onChange({ ...config, notice: e.target.value })}
                placeholder="例如：系统将于近期更新..."
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="defaultIntent" className="text-sm font-medium text-gray-700 dark:text-gray-200">默认 Intents</label>
              <Input
                id="defaultIntent"
                type="number"
                min={0}
                inputMode="numeric"
                value={config.defaultIntent}
                onChange={(e) => {
                  const value = Number(e.target.value || 0);
                  onChange({ ...config, defaultIntent: value });
                  if (errors.defaultIntent) {
                    setErrors({ ...errors, defaultIntent: '' });
                  }
                }}
                required
                placeholder="例如：100..."
                autoComplete="off"
                aria-describedby={errors.defaultIntent ? 'defaultIntent-error' : undefined}
              />
              {errors.defaultIntent && (
                <p id="defaultIntent-error" className="text-xs text-red-600 dark:text-red-400">{errors.defaultIntent}</p>
              )}
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
