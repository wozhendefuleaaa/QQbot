import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  useYunzaiPermission,
  useAddYunzaiMaster,
  useAddYunzaiAdmin,
  useRemoveYunzaiMaster,
  useRemoveYunzaiAdmin,
} from '../../hooks/useApi';

interface Props {
  loading: boolean;
}

export function YunzaiPermissionConfig({ loading }: Props) {
  const { data: yunzaiPermission, isLoading: yunzaiLoading } = useYunzaiPermission();
  const addMasterMutation = useAddYunzaiMaster();
  const addAdminMutation = useAddYunzaiAdmin();
  const removeMasterMutation = useRemoveYunzaiMaster();
  const removeAdminMutation = useRemoveYunzaiAdmin();

  // 云崽权限本地状态
  const [newMasterId, setNewMasterId] = useState('');
  const [newAdminId, setNewAdminId] = useState('');

  // 云崽权限管理函数
  const handleAddMaster = async () => {
    if (!newMasterId.trim()) return;
    try {
      await addMasterMutation.mutateAsync(newMasterId.trim());
      toast.success('主人添加成功');
      setNewMasterId('');
    } catch (error) {
      toast.error(`添加失败: ${(error as Error).message}`);
    }
  };

  const handleRemoveMaster = async (userId: string) => {
    try {
      await removeMasterMutation.mutateAsync(userId);
      toast.success('主人已移除');
    } catch (error) {
      toast.error(`移除失败: ${(error as Error).message}`);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminId.trim()) return;
    try {
      await addAdminMutation.mutateAsync(newAdminId.trim());
      toast.success('管理员添加成功');
      setNewAdminId('');
    } catch (error) {
      toast.error(`添加失败: ${(error as Error).message}`);
    }
  };

  const handleRemoveAdmin = async (userId: string) => {
    try {
      await removeAdminMutation.mutateAsync(userId);
      toast.success('管理员已移除');
    } catch (error) {
      toast.error(`移除失败: ${(error as Error).message}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>云崽插件权限配置</CardTitle>
        <CardDescription>
          配置云崽插件的主人和管理员。主人拥有最高权限，管理员次之。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {yunzaiLoading ? (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
            加载中...
          </div>
        ) : (
          <>
            {/* 主人配置 */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">主人列表</label>
              <p className="text-xs text-gray-500 dark:text-gray-400">主人拥有最高权限，可以使用所有云崽插件功能</p>
              
              {/* 添加主人 */}
              <div className="flex gap-2">
                <Input
                  placeholder="输入 QQ 号..."
                  value={newMasterId}
                  onChange={(e) => setNewMasterId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddMaster())}
                  className="flex-1"
                />
                <Button
                  onClick={handleAddMaster}
                  variant="secondary"
                  disabled={!newMasterId.trim() || addMasterMutation.isPending}
                >
                  添加
                </Button>
              </div>

              {/* 主人列表 */}
              <div className="flex flex-wrap gap-2">
                {yunzaiPermission?.masterIds?.length === 0 ? (
                  <span className="text-sm text-gray-400 dark:text-gray-500">暂无主人</span>
                ) : (
                  yunzaiPermission?.masterIds?.map((userId: string) => (
                    <div
                      key={userId}
                      className="flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm"
                    >
                      <span>👑 {userId}</span>
                      <button
                        onClick={() => handleRemoveMaster(userId)}
                        className="ml-1 hover:text-red-900 dark:hover:text-red-100"
                        aria-label={`移除主人 ${userId}`}
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 管理员配置 */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">管理员列表</label>
              <p className="text-xs text-gray-500 dark:text-gray-400">管理员可以使用大部分云崽插件功能（除主人专属功能外）</p>
              
              {/* 添加管理员 */}
              <div className="flex gap-2">
                <Input
                  placeholder="输入 QQ 号..."
                  value={newAdminId}
                  onChange={(e) => setNewAdminId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAdmin())}
                  className="flex-1"
                />
                <Button
                  onClick={handleAddAdmin}
                  variant="secondary"
                  disabled={!newAdminId.trim() || addAdminMutation.isPending}
                >
                  添加
                </Button>
              </div>

              {/* 管理员列表 */}
              <div className="flex flex-wrap gap-2">
                {yunzaiPermission?.adminIds?.length === 0 ? (
                  <span className="text-sm text-gray-400 dark:text-gray-500">暂无管理员</span>
                ) : (
                  yunzaiPermission?.adminIds?.map((userId: string) => (
                    <div
                      key={userId}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                    >
                      <span>🛡️ {userId}</span>
                      <button
                        onClick={() => handleRemoveAdmin(userId)}
                        className="ml-1 hover:text-blue-900 dark:hover:text-blue-100"
                        aria-label={`移除管理员 ${userId}`}
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
