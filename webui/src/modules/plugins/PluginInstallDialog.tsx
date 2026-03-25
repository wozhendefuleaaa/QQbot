import { MarketPlugin, InstallProgress } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Download,
  Archive,
  Package,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';

type PluginInstallDialogProps = {
  plugin: MarketPlugin | null;
  progress: InstallProgress | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PluginInstallDialog({
  plugin,
  progress,
  open,
  onOpenChange,
}: PluginInstallDialogProps) {
  if (!plugin) return null;

  // 获取状态图标
  const getStatusIcon = () => {
    if (!progress) {
      return <Loader2 className="w-6 h-6 animate-spin text-blue-500" />;
    }

    switch (progress.status) {
      case 'downloading':
        return <Download className="w-6 h-6 text-blue-500 animate-bounce" />;
      case 'extracting':
        return <Archive className="w-6 h-6 text-yellow-500 animate-pulse" />;
      case 'installing':
        return <Package className="w-6 h-6 text-orange-500 animate-pulse" />;
      case 'loading':
        return <RefreshCw className="w-6 h-6 text-purple-500 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="w-6 h-6 text-green-500" />;
      case 'failed':
        return <XCircle className="w-6 h-6 text-red-500" />;
      default:
        return <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />;
    }
  };

  // 获取状态文本
  const getStatusText = () => {
    if (!progress) return '准备中...';

    switch (progress.status) {
      case 'downloading':
        return '下载中';
      case 'extracting':
        return '解压中';
      case 'installing':
        return '安装中';
      case 'loading':
        return '加载中';
      case 'completed':
        return '安装完成';
      case 'failed':
        return '安装失败';
      default:
        return progress.message;
    }
  };

  // 获取进度条颜色
  const getProgressColor = () => {
    if (!progress) return 'bg-blue-500';

    switch (progress.status) {
      case 'downloading':
        return 'bg-blue-500';
      case 'extracting':
        return 'bg-yellow-500';
      case 'installing':
        return 'bg-orange-500';
      case 'loading':
        return 'bg-purple-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  const isCompleted = progress?.status === 'completed';
  const isFailed = progress?.status === 'failed';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon()}
            {isCompleted ? '安装成功' : isFailed ? '安装失败' : '正在安装插件'}
          </DialogTitle>
          <DialogDescription>
            {plugin.name} v{plugin.version}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 插件信息 */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{plugin.name}</p>
              <p className="text-sm text-muted-foreground truncate">
                by {plugin.author}
              </p>
            </div>
          </div>

          {/* 进度条 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{getStatusText()}</span>
              <span className="font-medium">{progress?.progress || 0}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${getProgressColor()}`}
                style={{ width: `${progress?.progress || 0}%` }}
              />
            </div>
          </div>

          {/* 详细消息 */}
          {progress?.message && (
            <p className="text-sm text-muted-foreground text-center">
              {progress.message}
            </p>
          )}

          {/* 错误信息 */}
          {isFailed && progress?.error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-500">{progress.error}</p>
            </div>
          )}

          {/* 操作按钮 */}
          {(isCompleted || isFailed) && (
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {isCompleted ? '完成' : '关闭'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
