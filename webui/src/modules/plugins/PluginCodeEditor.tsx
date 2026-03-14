import { PluginInfo } from '../../types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Code, Save, FileCode } from 'lucide-react';

type PluginCodeEditorProps = {
  plugin: PluginInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filename: string;
  content: string;
  onContentChange: (content: string) => void;
  loading: boolean;
  saving: boolean;
  onSave: () => Promise<void>;
};

export function PluginCodeEditor({
  plugin,
  open,
  onOpenChange,
  filename,
  content,
  onContentChange,
  loading,
  saving,
  onSave,
}: PluginCodeEditorProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            {plugin ? `编辑插件: ${plugin.name}` : '新建插件'}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <FileCode className="w-4 h-4" />
            {filename || '新插件'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              className="w-full h-[60vh] p-4 rounded-md bg-muted font-mono text-sm border resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="在此编写插件代码..."
              spellCheck={false}
            />
          )}
        </div>
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={onSave} disabled={saving || !content.trim()}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
