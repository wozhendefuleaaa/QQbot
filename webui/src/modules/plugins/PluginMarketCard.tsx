import { MarketPlugin } from '../../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  CheckCircle2,
  Star,
  GitBranch,
  ExternalLink,
  Clock,
  Package,
} from 'lucide-react';

type PluginMarketCardProps = {
  plugin: MarketPlugin;
  isInstalled: boolean;
  onInstall: () => void;
};

export function PluginMarketCard({ plugin, isInstalled, onInstall }: PluginMarketCardProps) {
  // 格式化更新时间
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // 获取分类标签颜色
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      chat: 'bg-blue-500/10 text-blue-500 border-blue-500',
      tool: 'bg-green-500/10 text-green-500 border-green-500',
      game: 'bg-yellow-500/10 text-yellow-500 border-yellow-500',
      ai: 'bg-purple-500/10 text-purple-500 border-purple-500',
      media: 'bg-pink-500/10 text-pink-500 border-pink-500',
      admin: 'bg-red-500/10 text-red-500 border-red-500',
      other: 'bg-gray-500/10 text-gray-500 border-gray-500',
    };
    return colors[category] || colors.other;
  };

  return (
    <div className="rounded-lg border bg-card overflow-hidden hover:shadow-md transition-shadow">
      {/* 卡片头部 */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <h3 className="font-medium truncate">{plugin.name}</h3>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>v{plugin.version}</span>
              <span>•</span>
              <span>by {plugin.author}</span>
            </div>
          </div>
          {isInstalled && (
            <Badge variant="outline" className="text-green-500 border-green-500 flex-shrink-0">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              已安装
            </Badge>
          )}
        </div>
      </div>

      {/* 卡片内容 */}
      <div className="p-4 space-y-3">
        {/* 描述 */}
        <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
          {plugin.description}
        </p>

        {/* 标签 */}
        <div className="flex flex-wrap gap-1">
          {plugin.yunzaiCompatible && (
            <Badge variant="outline" className="text-purple-500 border-purple-500 text-xs">
              <GitBranch className="w-3 h-3 mr-1" />
              云崽兼容
            </Badge>
          )}
          <Badge 
            variant="outline" 
            className={`text-xs ${getCategoryColor(plugin.category)}`}
          >
            {plugin.category}
          </Badge>
          {plugin.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        {/* 统计信息 */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {plugin.stars !== undefined && (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3" />
              <span>{plugin.stars}</span>
            </div>
          )}
          {plugin.downloads !== undefined && (
            <div className="flex items-center gap-1">
              <Download className="w-3 h-3" />
              <span>{plugin.downloads}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{formatDate(plugin.updatedAt)}</span>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2 pt-2">
          {isInstalled ? (
            <Button variant="outline" className="flex-1" disabled>
              <CheckCircle2 className="w-4 h-4 mr-1" />
              已安装
            </Button>
          ) : (
            <Button variant="default" className="flex-1" onClick={onInstall}>
              <Download className="w-4 h-4 mr-1" />
              安装
            </Button>
          )}
          {plugin.homepage && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.open(plugin.homepage, '_blank')}
              title="查看主页"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
          {plugin.repository && !plugin.homepage && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.open(plugin.repository, '_blank')}
              title="查看仓库"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
