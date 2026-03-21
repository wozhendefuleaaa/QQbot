import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Upload, FileCode } from 'lucide-react';

type PluginUploadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filename: string;
  onFilenameChange: (filename: string) => void;
  content: string;
  onContentChange: (content: string) => void;
  uploading: boolean;
  onUpload: () => Promise<void>;
};

export function PluginUploadDialog({
  open,
  onOpenChange,
  filename,
  onFilenameChange,
  content,
  onContentChange,
  uploading,
  onUpload,
}: PluginUploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFilenameChange(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const fileContent = event.target?.result as string;
        onContentChange(fileContent);
      }
      reader.readAsText(file);
    }
  };

  const handleUpload = async () => {
    await onUpload();
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            上传插件
          </DialogTitle>
          <DialogDescription>
            选择一个插件文件（.ts 或 .js）上传到服务器
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">选择文件</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".ts,.js"
              onChange={handleFileSelect}
              className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>
          {filename && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <FileCode className="w-4 h-4 text-black" />
                <span className="font-medium">{filename}</span>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-black">文件内容预览</label>
                <pre className="p-3 rounded-md bg-muted text-xs overflow-auto max-h-60 border">
                  {content.slice(0, 2000)}
                  {content.length > 2000 && '\n... (内容已截断)'}
                </pre>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleUpload} disabled={!filename || !content || uploading}>
            {uploading ? '上传中...' : '上传'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
