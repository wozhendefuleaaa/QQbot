import { PluginInfo } from '../../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Power,
  PowerOff,
  RefreshCw,
  Code,
  Info,
  Trash2,
  ChevronDown,
  ChevronUp,
  Package,
  MessageSquare,
  Clock,
  Terminal,
} from 'lucide-react';

type PluginCardProps = {
  plugin: PluginInfo;
  isExpanded: boolean;
  isReloading: boolean;
  onToggleExpand: () => void;
  onToggle: () => void;
  onReload: () => void;
  onEdit: () => void;
  onShowDetail: () => void;
  onDelete: () => void;
};

export function PluginCard({
  plugin,
  isExpanded,
  isReloading,
  onToggleExpand,
  onToggle,
  onReload,
  onEdit,
  onShowDetail,
  onDelete,
}: PluginCardProps) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* 插件头部 */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${plugin.enabled ? 'bg-green-500/10' : 'bg-gray-500/10'}`}>
            <Package className={`w-5 h-5 ${plugin.enabled ? 'text-green-500' : 'text-gray-500'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{plugin.name}</span>
              <span className="text-xs text-black">v{plugin.version}</span>
              {plugin.author && (
                <span className="text-xs text-black">by {plugin.author}</span>
              )}
            </div>
            <p className="text-sm text-black line-clamp-1">{plugin.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={plugin.enabled ? 'success' : 'secondary'}>
            {plugin.enabled ? '启用' : '停用'}
          </Badge>
          {plugin.loaded && (
            <Badge variant="outline" className="text-purple-500 border-purple-500">
              已加载
            </Badge>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-black" />
          ) : (
            <ChevronDown className="w-4 h-4 text-black" />
          )}
        </div>
      </div>

      {/* 展开详情 */}
      {isExpanded && (
        <div className="border-t px-4 py-3 bg-muted/30">
          {/* 功能标签 */}
          <div className="flex flex-wrap gap-2 mb-3">
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
              <Badge variant="outline">
                优先级: {plugin.priority}
              </Badge>
            )}
          </div>

          {/* 命令列表 */}
          {plugin.commands && plugin.commands.length > 0 && (
            <div className="mb-3">
              <p className="text-sm font-medium mb-2">命令列表</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {plugin.commands.map((cmd, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded bg-background border text-sm"
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

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={plugin.enabled ? 'destructive' : 'default'}
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
            >
              {plugin.enabled ? (
                <>
                  <PowerOff className="w-4 h-4 mr-1" />
                  停用
                </>
              ) : (
                <>
                  <Power className="w-4 h-4 mr-1" />
                  启用
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onReload();
              }}
              disabled={isReloading}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${isReloading ? 'animate-spin' : ''}`} />
              热重载
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Code className="w-4 h-4 mr-1" />
              编辑
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onShowDetail();
              }}
            >
              <Info className="w-4 h-4 mr-1" />
              详情
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              删除
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
