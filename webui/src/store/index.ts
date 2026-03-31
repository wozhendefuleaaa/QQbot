import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 导入各个模块的store
import { useAccountsStore } from './accounts';
import { useChatStore } from './chat';
import { useConfigStore } from './config';
import { usePlatformStore } from './platform';
import { usePluginsStore } from './plugins';

// 导出所有store
export {
  useAccountsStore,
  useChatStore,
  useConfigStore,
  usePlatformStore,
  usePluginsStore
};
