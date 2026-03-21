import { PluginInfo } from '../../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Package, MessageSquare, Clock, Terminal, Trash2 } from 'lucide-react';

type PluginDetailDialogProps = {
  plugin: PluginInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: string) => void;
};

export function PluginDetailDialog({ plugin, open, onOpenChange, onDelete }: PluginDetailDialogProps) {
  if (!plugin) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {plugin.name}
          </DialogTitle>
          <DialogDescription>{plugin.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-black">版本：</span>
              <span className="font-medium">{plugin.version}</span>
            </div>
            <div>
              <span className="text-black">作者：</span>
              <span className="font-medium">{plugin.author || '未知'}</span>
            </div>
            <div>
              <span className="text-black">状态：</span>
              <Badge variant={plugin.enabled ? 'success' : 'secondary'} className="ml-1">
                {plugin.enabled ? '启用' : '停用'}
              </Badge>
            </div>
            <div>
              <span className="text-black">加载：</span>
              <Badge variant={plugin.loaded ? 'default' : 'outline'} className="ml-1">
                {plugin.loaded ? '已加载' : '未加载'}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {plugin.hasOnMessage && (
              <Badge variant="outline" className="text-blue-500 border-blue-500">
                <MessageSquare className="w-3 h-3 mr-1" />
                消息处理
              </Badge>
            )}
            {plugin.hasCronJobs && (
              <Badge variant="outline" className="text-orange-500 border-orange-500">
                <Clock className="w-3 h-3 mr-1" />
                定时任务
              </Badge>
            )}
            {plugin.commands && plugin.commands.length > 0 && (
              <Badge variant="outline" className="text-green-500 border-green-500">
                <Terminal className="w-3 h-3 mr-1" />
                {plugin.commands.length} 个命令
              </Badge>
            )}
            {plugin.priority !== undefined && (
              <Badge variant="outline">优先级: {plugin.priority}</Badge>
            )}
          </div>

          {plugin.commands && plugin.commands.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">命令列表</p>
              <div className="space-y-2">
                {plugin.commands.map((cmd, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded bg-muted text-sm"
                  >
                    <div>
                      <code className="text-primary font-mono">/{cmd.name}</code>
                      <span className="text-black ml-2">{cmd.description}</span>
                    </div>
                    {cmd.permission && cmd.permission !== 'public' && (
                      <Badge variant="secondary" className="text-xs">
                        {cmd.permission}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="flex gap-2">
          <Button
            variant="destructive"
            onClick={() => {
              onDelete(plugin.id);
              onOpenChange(false);
            }}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            删除插件
          </Button>
          <Button onClick={() => onOpenChange(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
