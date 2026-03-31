import { MarketPlugin } from '../../types';
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
  Download,
  ExternalLink,
  GitBranch,
  Calendar,
  User,
  Tag,
  CheckCircle2,
  Package,
} from 'lucide-react';

type MarketPluginDetailDialogProps = {
  plugin: MarketPlugin | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isInstalled: boolean;
  onInstall: () => void;
};

export function MarketPluginDetailDialog({
  plugin,
  open,
  onOpenChange,
  isInstalled,
  onInstall,
}: MarketPluginDetailDialogProps) {
  if (!plugin) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      chat: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      tool: 'bg-green-500/10 text-green-500 border-green-500/20',
      game: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      ai: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      media: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
      admin: 'bg-red-500/10 text-red-500 border-red-500/20',
      other: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    };
    return colors[category] || colors.other;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      chat: '聊天',
      tool: '工具',
      game: '游戏',
      ai: 'AI',
      media: '媒体',
      admin: '管理',
      other: '其他',
    };
    return labels[category] || category;
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
                {isInstalled && (
                  <Badge variant="outline" className="text-green-500 border-green-500 ml-2">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    已安装
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="mt-2 text-base">
                {plugin.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">作者：</span>
              <span className="font-medium">{plugin.author}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">更新：</span>
              <span>{formatDate(plugin.updatedAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Download className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">下载量：</span>
              <span className="font-medium">{(plugin.downloads ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Tag className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">分类：</span>
              <Badge variant="outline" className={getCategoryColor(plugin.category)}>
                {getCategoryLabel(plugin.category)}
              </Badge>
            </div>
          </div>

          {/* 云崽兼容 */}
          {plugin.yunzaiCompatible && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-purple-500 border-purple-500">
                <GitBranch className="w-3 h-3 mr-1" />
                云崽兼容
              </Badge>
              <span className="text-sm text-muted-foreground">
                可直接使用云崽插件生态
              </span>
            </div>
          )}

          {/* 标签 */}
          <div>
            <h4 className="text-sm font-medium mb-2">标签</h4>
            <div className="flex flex-wrap gap-2">
              {plugin.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* 详细描述 */}
          {plugin.readme && (
            <div>
              <h4 className="text-sm font-medium mb-2">详细说明</h4>
              <div className="prose prose-sm dark:prose-invert max-w-none bg-muted/50 rounded-lg p-4">
                <div className="whitespace-pre-wrap text-sm">{plugin.readme}</div>
              </div>
            </div>
          )}

          {/* 版本信息 */}
          {plugin.version && (
            <div>
              <h4 className="text-sm font-medium mb-2">版本信息</h4>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">当前版本：</span>
                  <Badge variant="outline">v{plugin.version}</Badge>
                </div>
              </div>
            </div>
          )}

          {/* 依赖信息 */}
          {plugin.dependencies && plugin.dependencies.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">依赖</h4>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex flex-wrap gap-2">
                  {plugin.dependencies.map((dep) => (
                    <Badge key={dep} variant="secondary" className="text-xs">
                      {dep}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-2 pt-4 border-t">
            {isInstalled ? (
              <Button variant="outline" className="flex-1" disabled>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                已安装
              </Button>
            ) : (
              <Button className="flex-1" onClick={onInstall}>
                <Download className="w-4 h-4 mr-2" />
                安装插件
              </Button>
            )}
            {plugin.homepage && (
              <Button
                variant="outline"
                onClick={() => window.open(plugin.homepage, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                主页
              </Button>
            )}
            {plugin.repository && (
              <Button
                variant="outline"
                onClick={() => window.open(plugin.repository, '_blank')}
              >
                <GitBranch className="w-4 h-4 mr-2" />
                仓库
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
