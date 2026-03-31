import { RefreshCw, ArrowUp, CheckCircle } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { PluginUpdate } from '../../types';

type UpdateIndicatorProps = {
  updates: PluginUpdate[];
  checking: boolean;
  onCheckUpdates: () => void;
};

export function UpdateIndicator({ updates, checking, onCheckUpdates }: UpdateIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onCheckUpdates}
        disabled={checking}
        className="gap-1"
      >
        <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
        {checking ? '检测中...' : '检测更新'}
      </Button>
      
      {updates.length > 0 && (
        <Badge variant="destructive" className="gap-1 animate-pulse">
          <ArrowUp className="h-3 w-3" />
          {updates.length} 个更新
        </Badge>
      )}
    </div>
  );
}

type PluginUpdateBadgeProps = {
  update: PluginUpdate | undefined;
};

export function PluginUpdateBadge({ update }: PluginUpdateBadgeProps) {
  if (!update) return null;
  
  return (
    <Badge 
      variant="outline" 
      className="text-orange-500 border-orange-500 gap-1 animate-pulse"
    >
      <ArrowUp className="h-3 w-3" />
      可更新
    </Badge>
  );
}

type PluginUpdateBannerProps = {
  update: PluginUpdate;
  onUpdate: () => void;
  updating: boolean;
};

export function PluginUpdateBanner({ update, onUpdate, updating }: PluginUpdateBannerProps) {
  return (
    <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <ArrowUp className="h-5 w-5 text-orange-500" />
        <div>
          <p className="text-sm font-medium text-orange-700 dark:text-orange-400">
            有新版本可用
          </p>
          <p className="text-xs text-orange-600 dark:text-orange-500">
            {update.currentVersion} → {update.latestVersion}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        onClick={onUpdate}
        disabled={updating}
        className="bg-orange-500 hover:bg-orange-600 text-white"
      >
        {updating ? (
          <>
            <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
            更新中...
          </>
        ) : (
          <>
            <ArrowUp className="h-4 w-4 mr-1" />
            更新
          </>
        )}
      </Button>
    </div>
  );
}

type UpdateAvailableListProps = {
  updates: PluginUpdate[];
  onUpdate: (pluginId: string) => void;
  updatingId: string | null;
};

export function UpdateAvailableList({ updates, onUpdate, updatingId }: UpdateAvailableListProps) {
  if (updates.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 py-4">
        <CheckCircle className="h-5 w-5" />
        <span>所有插件都是最新版本</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {updates.map((update) => (
        <div
          key={update.id}
          className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg"
        >
          <div>
            <p className="font-medium text-sm">{update.name}</p>
            <p className="text-xs text-muted-foreground">
              {update.currentVersion} → {update.latestVersion}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => onUpdate(update.id)}
            disabled={updatingId === update.id}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {updatingId === update.id ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      ))}
    </div>
  );
}
