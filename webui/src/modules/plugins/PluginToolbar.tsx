import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Settings, Upload, Plus } from 'lucide-react';

type PluginToolbarProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterStatus: 'all' | 'enabled' | 'disabled';
  onFilterChange: (status: 'all' | 'enabled' | 'disabled') => void;
  onOpenConfig: () => void;
  onOpenUpload: () => void;
  onCreateNew: () => void;
};

export function PluginToolbar({
  searchQuery,
  onSearchChange,
  filterStatus,
  onFilterChange,
  onOpenConfig,
  onOpenUpload,
  onCreateNew,
}: PluginToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div className="flex gap-2 w-full sm:w-auto">
        <div className="relative flex-1 sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索插件..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => onFilterChange(e.target.value as 'all' | 'enabled' | 'disabled')}
          className="px-3 py-2 rounded-md border bg-background text-sm"
        >
          <option value="all">全部</option>
          <option value="enabled">已启用</option>
          <option value="disabled">已停用</option>
        </select>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onOpenConfig}>
          <Settings className="w-4 h-4 mr-2" />
          插件配置
        </Button>
        <Button variant="outline" onClick={onOpenUpload}>
          <Upload className="w-4 h-4 mr-2" />
          上传插件
        </Button>
        <Button onClick={onCreateNew}>
          <Plus className="w-4 h-4 mr-2" />
          新建插件
        </Button>
      </div>
    </div>
  );
}
