import { PluginInfo } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Trash2,
  RefreshCw,
  Code,
  Settings,
  CheckCircle2,
  Package,
  Terminal,
  Clock,
} from 'lucide-react';

type LocalPluginDetailDialogProps = {
  plugin: PluginInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: string) => Promise<void>;
  onReload?: (id: string) => Promise<void>;
  onEdit?: () => void;
};

export function LocalPluginDetailDialog({
  plugin,
  open,
  onOpenChange,
  onDelete,
  onReload,
  onEdit,
}: LocalPluginDetailDialogProps) {
  if (!plugin) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDelete = async () => {
    await onDelete(plugin.id);
    onOpenChange(false);
  };

  const handleReload = async () => {
    if (onReload) {
      await onReload(plugin.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl flex items-center gap-2">
                <Package className="w-5 h-5" />
                {plugin.name}
                {plugin.enabled && (
                  <Badge variant="outline" className="text-green-500 border-green-500 ml-2">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    已启用
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="mt-2 text-base">
                {plugin.description || '暂无描述'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Terminal className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">ID:</span>
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{plugin.id}</code>
            </div>
            {plugin.version && (
              <div className="flex items-center gap-2 text-sm">
                <Package className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">版本:</span>
                <Badge variant="outline" className="text-xs">v{plugin.version}</Badge>
              </div>
            )}
            {plugin.author && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">作者:</span>
                <span>{plugin.author}</span>
              </div>
            )}
          </div>

          {/* 功能标签 */}
          <div className="flex flex-wrap gap-2">
            {plugin.hasOnMessage && (
              <Badge variant="outline" className="text-blue-500 border-blue-500">
                消息监听
              </Badge>
            )}
            {plugin.hasCronJobs && (
              <Badge variant="outline" className="text-orange-500 border-orange-500">
                定时任务
              </Badge>
            )}
            {plugin.commands && plugin.commands.length > 0 && (
              <Badge variant="outline" className="text-green-500 border-green-500">
                {plugin.commands.length} 个命令
              </Badge>
            )}
          </div>

          {/* 命令列表 */}
          {plugin.commands && plugin.commands.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">命令列表</h4>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                {plugin.commands.map((cmd, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-sm">
                    <code className="bg-background px-2 py-1 rounded text-xs font-mono">
                      {cmd.name}
                    </code>
                    <span className="text-muted-foreground">{cmd.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            {onEdit && (
              <Button variant="outline" onClick={onEdit}>
                <Code className="w-4 h-4 mr-2" />
                编辑源码
              </Button>
            )}
            {onReload && (
              <Button variant="outline" onClick={handleReload}>
                <RefreshCw className="w-4 h-4 mr-2" />
                重载插件
              </Button>
            )}
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              删除插件
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}