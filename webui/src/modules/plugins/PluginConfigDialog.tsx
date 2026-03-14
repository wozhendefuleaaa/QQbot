import { PluginConfig } from '../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type PluginConfigDialogProps = {
  config: PluginConfig | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateConfig: (config: Partial<PluginConfig>) => Promise<void>;
};

export function PluginConfigDialog({ config, open, onOpenChange, onUpdateConfig }: PluginConfigDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>插件配置</DialogTitle>
        </DialogHeader>
        {config && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">允许群聊</label>
              <input
                type="checkbox"
                checked={config.allowGroup}
                onChange={(e) => onUpdateConfig({ allowGroup: e.target.checked })}
                className="w-4 h-4"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">允许私聊</label>
              <input
                type="checkbox"
                checked={config.allowPrivate}
                onChange={(e) => onUpdateConfig({ allowPrivate: e.target.checked })}
                className="w-4 h-4"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">管理员用户ID（逗号分隔）</label>
              <Input
                value={config.adminUserIds.join(', ')}
                onChange={(e) =>
                  onUpdateConfig({
                    adminUserIds: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="user1, user2"
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>完成</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
