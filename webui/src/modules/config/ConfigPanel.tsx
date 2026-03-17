import { FormEvent, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { AppConfig, PluginPermissionMatrix, BotAccount, PluginInfo } from '../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  useAccounts,
  usePlugins,
  usePluginPermissionMatrix,
  useAddGroupToMatrix,
  useRemoveGroupFromMatrix,
  useTogglePluginPermission,
  useBatchTogglePluginPermission,
  useContacts,
} from '../../hooks/useApi';

// 常量定义
const PRIVATE_CHAT_ID = 'private';
const PRIVATE_CHAT_LABEL = '私聊';

// 类型定义
interface GroupInfo {
  id: string;
  name: string;
  type: 'group' | 'private';
}

type Props = {
  config: AppConfig;
  onChange: (next: AppConfig) => void;
  onSave: (e: FormEvent) => void;
};

// 防抖函数
function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delay: number
): (...args: Args) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function ConfigPanel({ config, onChange, onSave }: Props) {
  // 使用 React Query hooks
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const { data: plugins = [], isLoading: pluginsLoading } = usePlugins();
  const { data: contactsData, isLoading: contactsLoading } = useContacts();

  // 本地状态
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [groupSearch, setGroupSearch] = useState('');
  const [manualGroupId, setManualGroupId] = useState('');
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  const groupSelectorRef = useRef<HTMLDivElement>(null);

  // 权限矩阵相关 hooks
  const { data: currentMatrix, isLoading: matrixLoading, error: matrixError } = usePluginPermissionMatrix(selectedAccountId);
  const addGroupMutation = useAddGroupToMatrix();
  const removeGroupMutation = useRemoveGroupFromMatrix();
  const togglePluginMutation = useTogglePluginPermission();
  const batchToggleMutation = useBatchTogglePluginPermission();

  // 点击外部关闭选择器
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (groupSelectorRef.current && !groupSelectorRef.current.contains(event.target as Node)) {
        setShowGroupSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 获取可用的群组和私聊列表（去重）- 使用 useMemo 缓存
  const availableGroups = useMemo<GroupInfo[]>(() => {
    const groupMap = new Map<string, GroupInfo>();

    // 添加私聊选项
    groupMap.set(PRIVATE_CHAT_ID, { id: PRIVATE_CHAT_ID, name: PRIVATE_CHAT_LABEL, type: 'private' });

    // 从 contacts API 获取的群组列表中提取
    if (contactsData?.groups) {
      // 获取当前选中账号的群组
      const accountGroups = contactsData.groups.find(g => g.accountId === selectedAccountId);
      if (accountGroups) {
        accountGroups.groups.forEach(g => {
          groupMap.set(g.id, {
            id: g.id,
            name: g.name || g.id,
            type: 'group'
          });
        });
      }
      
      // 同时添加所有账号的群组（供选择）
      contactsData.groups.forEach(accountGroups => {
        accountGroups.groups.forEach(g => {
          if (!groupMap.has(g.id)) {
            groupMap.set(g.id, {
              id: g.id,
              name: g.name || g.id,
              type: 'group'
            });
          }
        });
      });
    }

    return Array.from(groupMap.values());
  }, [contactsData, selectedAccountId]);

  // 过滤群组列表 - 使用 useMemo 缓存
  const filteredGroups = useMemo<GroupInfo[]>(() => {
    if (!groupSearch.trim()) return availableGroups;

    const search = groupSearch.toLowerCase();
    return availableGroups.filter(g =>
      g.id.toLowerCase().includes(search) ||
      g.name.toLowerCase().includes(search)
    );
  }, [availableGroups, groupSearch]);

  // 添加群组
  const addGroup = useCallback(async (groupId: string) => {
    if (!selectedAccountId || !groupId.trim()) return false;

    // 检查是否已添加
    if (currentMatrix?.groups.includes(groupId)) {
      toast.warning('该群组已添加');
      return false;
    }

    try {
      await addGroupMutation.mutateAsync({ accountId: selectedAccountId, groupId });
      toast.success('群组添加成功');
      return true;
    } catch (error) {
      toast.error(`添加群组失败: ${(error as Error).message}`);
      return false;
    }
  }, [selectedAccountId, currentMatrix, addGroupMutation]);

  // 从下拉列表选择群组
  const handleSelectGroup = async (groupId: string) => {
    const success = await addGroup(groupId);
    if (success) {
      setShowGroupSelector(false);
      setGroupSearch('');
    }
  };

  // 手动输入添加群组
  const handleManualAdd = async () => {
    if (!manualGroupId.trim()) return;

    const success = await addGroup(manualGroupId.trim());
    if (success) {
      setManualGroupId('');
    }
  };

  // 删除群组 - 显示确认对话框
  const handleDeleteGroup = async (groupId: string) => {
    if (!selectedAccountId) return;

    try {
      await removeGroupMutation.mutateAsync({ accountId: selectedAccountId, groupId });
      toast.success('群组已删除');
      setGroupToDelete(null);
    } catch (error) {
      toast.error(`删除群组失败: ${(error as Error).message}`);
    }
  };

  // 切换插件状态 - 带防抖
  const handleTogglePlugin = useMemo(
    () =>
      debounce((groupId: string, pluginId: string, currentlyDisabled: boolean) => {
        if (!selectedAccountId) return;

        togglePluginMutation.mutate({
          accountId: selectedAccountId,
          groupId,
          pluginId,
          disabled: !currentlyDisabled,
        }, {
          onError: (error) => {
            toast.error(`切换插件状态失败: ${(error as Error).message}`);
          },
        });
      }, 300),
    [selectedAccountId, togglePluginMutation]
  );

  // 批量切换插件状态
  const handleBatchToggle = async (groupId: string, disabled: boolean) => {
    if (!selectedAccountId) return;

    const pluginIds = plugins.map(p => p.id);
    if (pluginIds.length === 0) {
      toast.warning('没有可操作的插件');
      return;
    }

    try {
      await batchToggleMutation.mutateAsync({
        accountId: selectedAccountId,
        groupId,
        pluginIds,
        disabled,
      });
      toast.success(disabled ? '已全部禁用' : '已全部启用');
    } catch (error) {
      toast.error(`批量操作失败: ${(error as Error).message}`);
    }
  };

  // 检查插件是否被禁用
  const isPluginDisabled = (groupId: string, pluginId: string): boolean => {
    if (!currentMatrix) return false;
    const disabledList = currentMatrix.disabledPlugins[groupId];
    return disabledList ? disabledList.includes(pluginId) : false;
  };

  // 获取群组显示名称
  const getGroupDisplayName = (groupId: string): string => {
    if (groupId === PRIVATE_CHAT_ID) return PRIVATE_CHAT_LABEL;
    const group = availableGroups.find(g => g.id === groupId);
    return group?.name || `群:${groupId}`;
  };

  // 保存配置
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await onSave(e);
      toast.success('配置已保存');
    } catch (error) {
      toast.error(`保存失败: ${(error as Error).message}`);
    }
  };

  // 加载状态
  const isLoading = accountsLoading || pluginsLoading;
  const isMatrixLoading = selectedAccountId && matrixLoading && !currentMatrix;

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      {/* 基础配置 */}
      <Card>
        <CardHeader>
          <CardTitle>基础配置</CardTitle>
          <CardDescription>管理系统基础配置参数</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">控制台名称</label>
                <Input
                  value={config.webName}
                  onChange={(e) => onChange({ ...config, webName: e.target.value })}
                  required
                  placeholder="请输入控制台名称"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">系统公告</label>
                <Input
                  value={config.notice}
                  onChange={(e) => onChange({ ...config, notice: e.target.value })}
                  placeholder="请输入系统公告"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">默认 Intents</label>
                <Input
                  type="number"
                  min={0}
                  value={config.defaultIntent}
                  onChange={(e) => onChange({ ...config, defaultIntent: Number(e.target.value || 0) })}
                  required
                  placeholder="请输入默认 Intents"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="allowOpenApi"
                checked={config.allowOpenApi}
                onChange={(e) => onChange({ ...config, allowOpenApi: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="allowOpenApi" className="text-sm font-medium cursor-pointer text-gray-700 dark:text-gray-200">
                启用 OpenAPI
              </label>
            </div>

            <Button type="submit" disabled={isLoading}>
              保存配置
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 插件权限矩阵 */}
      <Card>
        <CardHeader>
          <CardTitle>插件权限矩阵</CardTitle>
          <CardDescription>
            配置每个机器人在不同群组中禁用的插件。勾选表示禁用该插件。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 选择机器人账号 */}
          <div className="flex items-center gap-4">
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">选择机器人账号</label>
              <select
                className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                aria-label="选择机器人账号"
              >
                <option value="">请选择账号</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.appId})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedAccountId && currentMatrix && (
            <>
              {/* 添加群组 - 混合模式：手动输入 + 搜索选择 */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">添加群组/私聊</label>

                {/* 手动输入区域 */}
                <div className="flex gap-2">
                  <Input
                    placeholder="手动输入群组ID..."
                    value={manualGroupId}
                    onChange={(e) => setManualGroupId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleManualAdd())}
                    className="flex-1"
                    aria-label="手动输入群组ID"
                  />
                  <Button
                    onClick={handleManualAdd}
                    variant="secondary"
                    disabled={!manualGroupId.trim() || addGroupMutation.isPending}
                  >
                    添加
                  </Button>
                </div>

                {/* 搜索选择区域 */}
                <div className="relative" ref={groupSelectorRef}>
                  <Input
                    placeholder="或从现有会话中搜索选择..."
                    value={groupSearch}
                    onChange={(e) => {
                      setGroupSearch(e.target.value);
                      setShowGroupSelector(true);
                    }}
                    onFocus={() => setShowGroupSelector(true)}
                    className="cursor-pointer"
                    aria-label="搜索选择群组"
                    aria-expanded={showGroupSelector}
                    aria-haspopup="listbox"
                  />
                  {showGroupSelector && (
                    <div
                      className="absolute z-10 w-full mt-1 max-h-60 overflow-auto border rounded-md bg-white dark:bg-gray-800 shadow-lg border-gray-200 dark:border-gray-700"
                      role="listbox"
                      aria-label="群组列表"
                    >
                      {filteredGroups.length === 0 ? (
                        <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-sm">无匹配结果</div>
                      ) : (
                        filteredGroups.map(group => {
                          const isAdded = currentMatrix.groups.includes(group.id);
                          return (
                            <div
                              key={group.id}
                              className={`px-3 py-2 cursor-pointer flex items-center justify-between transition-colors ${
                                isAdded
                                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                              }`}
                              onClick={() => !isAdded && handleSelectGroup(group.id)}
                              role="option"
                              aria-selected={isAdded}
                              aria-disabled={isAdded}
                            >
                              <div className="flex items-center gap-2">
                                {group.type === 'private' ? (
                                  <span className="text-blue-500" aria-hidden="true">👤</span>
                                ) : (
                                  <span className="text-green-500" aria-hidden="true">👥</span>
                                )}
                                <span className="font-medium">{group.name}</span>
                                {group.id !== PRIVATE_CHAT_ID && (
                                  <span className="text-xs text-gray-400 dark:text-gray-500">({group.id})</span>
                                )}
                              </div>
                              {isAdded && (
                                <span className="text-xs text-gray-400 dark:text-gray-500">已添加</span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  提示：可以直接输入群组ID添加，也可以从现有会话中选择。输入 "{PRIVATE_CHAT_ID}" 可添加私聊权限。
                </p>
              </div>

              {/* 权限矩阵表格 */}
              {currentMatrix.groups.length > 0 ? (
                <div className="overflow-x-auto border rounded-lg border-gray-200 dark:border-gray-700">
                  <table className="w-full text-sm" aria-label="插件权限矩阵表格">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800">
                        <th scope="col" className="px-4 py-3 text-left font-medium border-b border-gray-200 dark:border-gray-700 sticky left-0 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                          群组
                        </th>
                        {plugins.map(plugin => (
                          <th key={plugin.id} scope="col" className="px-3 py-3 text-center font-medium border-b border-gray-200 dark:border-gray-700 min-w-[100px] text-gray-700 dark:text-gray-200">
                            <div className="flex flex-col items-center">
                              <span className="truncate max-w-[80px]" title={plugin.name}>
                                {plugin.name}
                              </span>
                            </div>
                          </th>
                        ))}
                        <th scope="col" className="px-4 py-3 text-center font-medium border-b border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentMatrix.groups.map(groupId => (
                        <tr key={groupId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 font-medium sticky left-0 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                            {groupId === PRIVATE_CHAT_ID ? (
                              <span className="text-blue-600 dark:text-blue-400">👤 {PRIVATE_CHAT_LABEL}</span>
                            ) : (
                              <span>
                                👥 {getGroupDisplayName(groupId)}
                              </span>
                            )}
                          </td>
                          {plugins.map(plugin => {
                            const disabled = isPluginDisabled(groupId, plugin.id);
                            return (
                              <td key={plugin.id} className="px-3 py-3 text-center border-b border-gray-200 dark:border-gray-700">
                                <label className="inline-flex items-center justify-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={disabled}
                                    onChange={() => handleTogglePlugin(groupId, plugin.id, disabled)}
                                    className="h-5 w-5 rounded border-gray-300 dark:border-gray-600 text-red-600 focus:ring-red-500 dark:bg-gray-700"
                                    aria-label={`${getGroupDisplayName(groupId)} - ${plugin.name}: ${disabled ? '已禁用' : '已启用'}`}
                                  />
                                </label>
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 text-center border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-center gap-2">
                              {/* 批量操作按钮 */}
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs text-gray-600 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                  onClick={() => handleBatchToggle(groupId, true)}
                                  title="禁用所有插件"
                                >
                                  全禁
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs text-gray-600 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                  onClick={() => handleBatchToggle(groupId, false)}
                                  title="启用所有插件"
                                >
                                  全启
                                </Button>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 dark:text-red-400 dark:hover:text-red-300"
                                onClick={() => setGroupToDelete(groupId)}
                              >
                                删除
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  暂无群组配置，请从上方添加群组或私聊
                </div>
              )}

              {/* 图例说明 */}
              <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked disabled className="h-4 w-4 rounded border-gray-300 dark:border-gray-600" />
                  <span>禁用插件</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" disabled className="h-4 w-4 rounded border-gray-300 dark:border-gray-600" />
                  <span>启用插件</span>
                </div>
              </div>
            </>
          )}

          {/* 加载状态 */}
          {selectedAccountId && isMatrixLoading && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-500 rounded-full"></div>
                加载权限矩阵...
              </div>
            </div>
          )}

          {/* 错误状态 */}
          {selectedAccountId && matrixError && (
            <div className="text-center py-8 text-red-500 dark:text-red-400">
              加载权限矩阵失败: {(matrixError as Error).message}
              <Button
                variant="ghost"
                size="sm"
                className="ml-2"
                onClick={() => setSelectedAccountId(selectedAccountId)}
              >
                重试
              </Button>
            </div>
          )}

          {!selectedAccountId && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              请先选择一个机器人账号来配置插件权限
            </div>
          )}
        </CardContent>
      </Card>

      {/* 删除确认对话框 */}
      {groupToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 id="delete-dialog-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              确认删除
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              确定要删除群组 "{groupToDelete === PRIVATE_CHAT_ID ? PRIVATE_CHAT_LABEL : getGroupDisplayName(groupToDelete)}" 的权限配置吗？此操作不可撤销。
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setGroupToDelete(null)}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteGroup(groupToDelete)}
                disabled={removeGroupMutation.isPending}
              >
                {removeGroupMutation.isPending ? '删除中...' : '确认删除'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
