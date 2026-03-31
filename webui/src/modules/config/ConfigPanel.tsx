import { FormEvent } from 'react';
import { toast } from 'sonner';
import { AppConfig } from '../../types';
import { Button } from '@/components/ui/button';
import { BasicConfig } from './BasicConfig';
import { YunzaiPermissionConfig } from './YunzaiPermissionConfig';
import { PluginPermissionMatrix } from './PluginPermissionMatrix';

type Props = {
  config: AppConfig;
  onChange: (next: AppConfig) => void;
  onSave: (e: FormEvent) => void;
};

export function ConfigPanel({ config, onChange, onSave }: Props) {
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await onSave(e);
      toast.success('配置已保存');
    } catch (error) {
      toast.error(`保存失败: ${(error as Error).message}`);
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      {/* 基础配置 */}
      <BasicConfig 
        config={config} 
        onChange={onChange} 
        onSave={handleSave} 
        loading={false} 
      />

      {/* 云崽权限配置 */}
      <YunzaiPermissionConfig loading={false} />

      {/* 插件权限矩阵 */}
      <PluginPermissionMatrix loading={false} />
    </div>
  );
}
