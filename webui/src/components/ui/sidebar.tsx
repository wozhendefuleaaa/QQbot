import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const sidebarVariants = cva(
  "hidden md:flex flex-col border-r bg-background",
  {
    variants: {
      size: {
        default: "w-56",
        sm: "w-48",
        lg: "w-64",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

export interface SidebarProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof sidebarVariants> {}

const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  ({ className, size, ...props }, ref) => (
    <aside
      ref={ref}
      className={cn(sidebarVariants({ size }), className)}
      {...props}
    />
  )
)
Sidebar.displayName = "Sidebar"

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center gap-2 p-4 border-b", className)}
    {...props}
  />
))
SidebarHeader.displayName = "SidebarHeader"

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex-1 overflow-auto p-2", className)}
    {...props}
  />
))
SidebarContent.displayName = "SidebarContent"

const SidebarNav = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <nav
    ref={ref}
    className={cn("flex flex-col gap-1", className)}
    {...props}
  />
))
SidebarNav.displayName = "SidebarNav"

const sidebarNavItemVariants = cva(
  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        active: "bg-primary/10 text-primary font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface SidebarNavItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof sidebarNavItemVariants> {
  active?: boolean
  icon?: React.ReactNode
}

const SidebarNavItem = React.forwardRef<HTMLButtonElement, SidebarNavItemProps>(
  ({ className, variant, active, icon, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-current={active ? "page" : undefined}
      className={cn(
        sidebarNavItemVariants({ variant: active ? "active" : "default" }),
        className
      )}
      {...props}
    >
      {icon && <span className="text-lg">{icon}</span>}
      {children}
    </button>
  )
)
SidebarNavItem.displayName = "SidebarNavItem"

// 移动端底部导航组件
export interface MobileNavItem {
  key: string
  label: string
  icon: string
  badge?: number | string
}

export interface MobileNavProps {
  items: MobileNavItem[]
  activeKey: string
  onItemClick: (key: string) => void
  className?: string
  visible?: boolean
}

const MobileNav = React.forwardRef<HTMLElement, MobileNavProps>(
  ({ items, activeKey, onItemClick, className, visible = true }, ref) => {
    if (!visible) return null
    
    return (
      <nav
        ref={ref}
        className={cn(
          "md:hidden fixed bottom-0 left-0 right-0 z-50",
          "bg-background/95 backdrop-blur-md border-t",
          "safe-area-inset-bottom",
          "transition-transform duration-300 ease-out",
          !visible && "translate-y-full",
          className
        )}
      >
        <div className="flex items-center justify-around h-14 px-1">
          {items.map((item) => (
            <button
              key={item.key}
              onClick={() => onItemClick(item.key)}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 h-full",
                "text-xs font-medium transition-all duration-150",
                "active:scale-90 touch-manipulation",
                "py-1.5",
                activeKey === item.key
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="text-xl mb-0.5 relative">
                {item.icon}
                {item.badge !== undefined && item.badge !== 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </span>
              <span className="text-[10px] leading-tight truncate max-w-[4rem]">
                {item.label.length > 4 ? item.label.slice(0, 4) : item.label}
              </span>
              {activeKey === item.key && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>
      </nav>
    )
  }
)
MobileNav.displayName = "MobileNav"

// 移动端头部组件
export interface MobileHeaderProps {
  title: string
  subtitle?: string
  platformStatus?: { connected: boolean; connecting: boolean }
  user?: { username: string; role: string } | null
  onLogout?: () => void
  className?: string
  showBack?: boolean
  onBack?: () => void
  rightContent?: React.ReactNode
}

const MobileHeader = React.forwardRef<HTMLDivElement, MobileHeaderProps>(
  ({ title, subtitle, platformStatus, user, onLogout, className, showBack, onBack, rightContent }, ref) => (
    <header
      ref={ref}
      className={cn(
        "md:hidden flex items-center justify-between px-4 py-3",
        "bg-card/95 backdrop-blur-md border-b shrink-0",
        "safe-area-inset-top",
        "sticky top-0 z-40",
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {showBack && (
          <button
            onClick={onBack}
            className="flex items-center justify-center w-8 h-8 -ml-1 rounded-lg hover:bg-muted active:scale-95 transition-all shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {!showBack && (
          <span className="text-xl shrink-0">🤖</span>
        )}
        <div className="min-w-0">
          <h1 className="text-base font-semibold truncate max-w-[12rem]">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {rightContent}
        {platformStatus && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50">
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                platformStatus.connected
                  ? "bg-green-500"
                  : platformStatus.connecting
                  ? "bg-yellow-500 animate-pulse"
                  : "bg-gray-400"
              )}
            />
            <span className="text-[10px] text-muted-foreground">
              {platformStatus.connected ? '在线' : platformStatus.connecting ? '连接中' : '离线'}
            </span>
          </div>
        )}
        {user && !platformStatus && (
          <button
            onClick={onLogout}
            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded-md transition-colors"
          >
            退出
          </button>
        )}
      </div>
    </header>
  )
)
MobileHeader.displayName = "MobileHeader"

export {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarNav,
  SidebarNavItem,
  MobileNav,
  MobileHeader,
}
