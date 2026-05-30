import React, { useMemo } from 'react';
import { cn } from '../../lib/utils';
import { ThemeToggle } from '../ui/theme-toggle';
import { Sidebar, SidebarHeader, SidebarContent, SidebarNav, SidebarNavItem, MobileNav, MobileHeader } from '../ui/sidebar';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import type { MenuKey, User, PlatformStatus } from '../../types';

interface AppShellProps {
  activeMenu: MenuKey;
  onMenuChange: (key: MenuKey) => void;
  platformStatus: PlatformStatus;
  isMutating: boolean;
  user: User | null;
  onLogout: () => void;
  showMoreMenu: boolean;
  onToggleMoreMenu: () => void;
  children: React.ReactNode;
}

const MENU_ITEMS: { key: MenuKey; label: string }[] = [
  { key: 'home', label: '控制台首页' },
  { key: 'accounts', label: '账号管理' },
  { key: 'chat', label: '聊天中心' },
  { key: 'platform', label: 'QQ 平台连接' },
  { key: 'config', label: '配置中心' },
  { key: 'logs', label: '日志中心' },
  { key: 'statistics', label: '统计中心' },
  { key: 'openapi', label: '开放 API' },
  { key: 'plugins', label: '插件中心' },
];

const MENU_ICON_MAP: Record<string, string> = {
  home: '🏠', accounts: '👥', chat: '💬', platform: '🔌',
  config: '⚙️', logs: '📋', statistics: '📊', openapi: '🔗', plugins: '🧩',
};

const MOBILE_NAV_ITEMS = [
  { key: 'home', label: '首页', icon: '🏠' },
  { key: 'chat', label: '聊天', icon: '💬' },
  { key: 'platform', label: '平台', icon: '🔌' },
  { key: 'plugins', label: '插件', icon: '🧩' },
  { key: 'more', label: '更多', icon: '☰' },
];

const MAIN_MENU_KEYS = new Set(['home', 'chat', 'platform', 'plugins']);
const MORE_MENU_ITEMS = MENU_ITEMS.filter((item) => !MAIN_MENU_KEYS.has(item.key));

export function AppShell({
  activeMenu, onMenuChange, platformStatus, isMutating,
  user, onLogout, showMoreMenu, onToggleMoreMenu, children,
}: AppShellProps) {
  const { isOnline, showBanner: showOfflineBanner, dismissBanner: dismissOfflineBanner } = useNetworkStatus();

  const handleMobileNav = (key: string) => {
    if (key === 'more') {
      onToggleMoreMenu();
    } else {
      onMenuChange(key as MenuKey);
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* 桌面端侧边栏 */}
      <Sidebar>
        <SidebarHeader>
          <span className="text-2xl transition-transform duration-300 ease-in-out hover:scale-110">🤖</span>
          <span className="font-semibold text-lg transition-all duration-300 ease-in-out">Wawa-QQbot</span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav>
            {MENU_ITEMS.map((item) => (
              <SidebarNavItem
                key={item.key}
                active={activeMenu === item.key}
                icon={MENU_ICON_MAP[item.key]}
                onClick={() => onMenuChange(item.key)}
              >
                {item.label}
              </SidebarNavItem>
            ))}
          </SidebarNav>
        </SidebarContent>
      </Sidebar>

      <main className="flex-1 flex flex-col overflow-hidden h-full pb-[calc(4rem+env(safe-area-inset-bottom,0))] md:pb-0">
        {/* 桌面端头部 */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 border-b bg-card shrink-0 shadow-sm transition-all duration-300 ease-in-out">
          <h1 className="text-xl font-semibold transition-all duration-300 ease-in-out">Wawa-QQbot 控制台</h1>
          <div className="flex items-center gap-5">
            <ThemeToggle />
            <StatusBadge platformStatus={platformStatus} />
            {user && <UserBadge user={user} onLogout={onLogout} />}
          </div>
        </header>

        {/* 移动端头部 */}
        <MobileHeader title="Wawa-QQbot" platformStatus={platformStatus} user={user} onLogout={onLogout} />

        {/* 移动端状态指示栏 */}
        <div className="md:hidden flex items-center justify-between px-4 py-2 bg-muted/30 border-b text-xs transition-all duration-300 ease-in-out">
          <div className="flex items-center gap-2">
            <ConnectionDot connected={platformStatus.connected} />
            <span className="text-foreground font-medium">
              {platformStatus.connected ? '已连接' : platformStatus.connecting ? '连接中' : '未连接'}
            </span>
          </div>
          <ThemeToggle />
        </div>

        {/* 状态通知栏 */}
        {isMutating && (
          <div className="px-4 md:px-8 py-3 md:py-4 border-b bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 transition-all duration-300 ease-in-out">
            <p className="text-sm md:text-base text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <span className="animate-spin">⏳</span>
              处理中，请稍候...
            </p>
          </div>
        )}

        {showOfflineBanner && (
          <div className="px-4 md:px-8 py-3 md:py-4 border-b bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 transition-all duration-300 ease-in-out">
            <p className="text-sm md:text-base text-red-700 dark:text-red-300 flex items-center gap-2">
              <span>🔌</span>
              网络连接已断开
              <button
                onClick={dismissOfflineBanner}
                className="ml-auto text-xs px-2 py-1 rounded-md bg-red-200 dark:bg-red-800 hover:bg-red-300 dark:hover:bg-red-700 transition-colors"
              >
                关闭
              </button>
            </p>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-auto p-4 md:p-6 lg:p-8 transition-all duration-300 ease-in-out">
          {children}
        </div>
      </main>

      {/* 移动端底部导航 */}
      <MobileNav
        items={MOBILE_NAV_ITEMS}
        activeKey={showMoreMenu ? 'more' : activeMenu}
        onItemClick={handleMobileNav}
      />

      {/* 移动端更多菜单 */}
      {showMoreMenu && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50 animate-fade-in-overlay" onClick={onToggleMoreMenu}>
          <div className="absolute bottom-[calc(4rem+env(safe-area-inset-bottom,0))] left-0 right-0 bg-card border-t rounded-t-2xl p-5 animate-slide-up-modal shadow-2xl shadow-black/10" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-4 gap-5">
              {MORE_MENU_ITEMS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => onMenuChange(item.key)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted active:scale-95 transition-all duration-200 ease-in-out"
                >
                  <span className="text-2xl transition-transform duration-200 ease-in-out hover:scale-110">{MENU_ICON_MAP[item.key]}</span>
                  <span className="text-xs font-medium text-muted-foreground transition-all duration-200 ease-in-out">{item.label}</span>
                </button>
              ))}
            </div>
            {user && (
              <div className="mt-5 pt-5 border-t flex items-center justify-between transition-all duration-200 ease-in-out">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{user.username}</span>
                  <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
                    {user.role === 'admin' ? '管理员' : '用户'}
                  </span>
                </div>
                <button onClick={onLogout} className="text-sm font-medium text-destructive hover:bg-destructive/10 px-4 py-2 rounded-lg transition-all duration-200 ease-in-out">
                  退出登录
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ platformStatus }: { platformStatus: PlatformStatus }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/70 transition-all duration-200 ease-in-out">
      <ConnectionDot connected={platformStatus.connected} />
      <span className="text-sm font-medium text-muted-foreground transition-all duration-200 ease-in-out">
        {platformStatus.connected ? '已连接' : platformStatus.connecting ? '连接中' : '未连接'}
      </span>
    </div>
  );
}

function ConnectionDot({ connected }: { connected: boolean }) {
  return (
    <span className={cn(
      'w-2.5 h-2.5 rounded-full transition-all duration-300 ease-in-out',
      connected ? 'bg-green-500 scale-110' : 'bg-gray-400',
    )} />
  );
}

function UserBadge({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-all duration-200 ease-in-out">
      <span className="text-sm font-medium text-foreground">
        {user.username}
        <span className="ml-1.5 text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
          {user.role === 'admin' ? '管理员' : '用户'}
        </span>
      </span>
      <button onClick={onLogout} className="text-sm font-medium text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-lg transition-all duration-200 ease-in-out">
        退出登录
      </button>
    </div>
  );
}