import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const sidebarVariants = cva(
  "hidden md:flex flex-col border-r bg-background transition-all duration-300 ease-in-out",
  {
    variants: {
      size: {
        default: "w-60",
        sm: "w-52",
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
      className={cn(
        sidebarVariants({ size }),
        "shadow-lg dark:shadow-slate-900/30",
        "backdrop-blur-sm bg-background/90 dark:bg-background/95",
        className
      )}
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
    className={cn(
      "flex items-center gap-3 p-5 border-b",
      "border-border/50",
      "transition-all duration-300",
      className
    )}
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
    className={cn(
      "flex-1 overflow-auto p-3",
      "scrollbar-thin scrollbar-thumb-muted/50 scrollbar-track-transparent",
      className
    )}
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
    className={cn(
      "flex flex-col gap-1.5",
      className
    )}
    {...props}
  />
))
SidebarNav.displayName = "SidebarNav"

const sidebarNavItemVariants = cva(
  "flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ease-in-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:translate-x-1",
        active: "bg-primary/15 text-primary font-semibold shadow-sm",
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
  badge?: number | string
}

const SidebarNavItem = React.forwardRef<HTMLButtonElement, SidebarNavItemProps>(
  ({ className, variant, active, icon, children, badge, ...props }, ref) => (
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
      {icon && (
        <span className="text-lg transition-transform duration-200 ease-in-out">
          {icon}
        </span>
      )}
      <span className="flex-1 truncate">{children}</span>
      {badge !== undefined && badge !== 0 && (
        <span className="flex items-center justify-center min-w-6 h-6 px-1.5 py-0.5 bg-primary text-primary-foreground text-xs font-bold rounded-full transition-all duration-200 ease-in-out">
          {typeof badge === 'number' && badge > 99 ? '99+' : badge}
        </span>
      )}
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
          "bg-background/98 backdrop-blur-lg border-t border-border/50",
          "safe-area-inset-bottom",
          "transition-all duration-300 ease-out",
          "shadow-lg shadow-black/5 dark:shadow-slate-900/30",
          !visible && "translate-y-full",
          className
        )}
      >
        <div className="flex items-center justify-around h-16 px-2">
          {items.map((item) => (
            <button
              key={item.key}
              onClick={() => onItemClick(item.key)}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 h-full",
                "text-xs font-medium transition-all duration-200 ease-in-out",
                "active:scale-90 touch-manipulation",
                "py-2",
                activeKey === item.key
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="text-2xl mb-1 relative transition-transform duration-200 ease-in-out">
                {item.icon}
                {item.badge !== undefined && item.badge !== 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-5 px-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center animate-scale-in">
                    {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </span>
              <span className="text-[11px] leading-tight truncate max-w-[4rem] font-medium">
                {item.label.length > 4 ? item.label.slice(0, 4) : item.label}
              </span>
              {activeKey === item.key && (
                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary animate-scale-in" />
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
        "md:hidden flex items-center justify-between px-4 py-4",
        "bg-card/98 backdrop-blur-lg border-b border-border/50 shrink-0",
        "safe-area-inset-top",
        "sticky top-0 z-40",
        "shadow-sm shadow-black/5 dark:shadow-slate-900/20",
        "transition-all duration-300 ease-in-out",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {showBack && (
          <button
            onClick={onBack}
            className="flex items-center justify-center w-9 h-9 -ml-1 rounded-xl hover:bg-muted active:scale-95 transition-all shrink-0"
          >
            <svg className="w-5 h-5 transition-transform duration-200 ease-in-out" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {!showBack && (
          <span className="text-2xl shrink-0 transition-transform duration-200 ease-in-out">🤖</span>
        )}
        <div className="min-w-0">
          <h1 className="text-lg font-semibold truncate max-w-[12rem] transition-all duration-200 ease-in-out">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate transition-all duration-200 ease-in-out">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {rightContent}
        {platformStatus && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/70 transition-all duration-200 ease-in-out">
            <span
              className={cn(
                "w-2.5 h-2.5 rounded-full",
                "transition-all duration-300 ease-in-out",
                platformStatus.connected
                  ? "bg-green-500 scale-110"
                  : platformStatus.connecting
                  ? "bg-yellow-500 animate-pulse"
                  : "bg-gray-400"
              )}
            />
            <span className="text-xs font-medium text-muted-foreground transition-all duration-200 ease-in-out">
              {platformStatus.connected ? '在线' : platformStatus.connecting ? '连接中' : '离线'}
            </span>
          </div>
        )}
        {user && !platformStatus && (
          <button
            onClick={onLogout}
            className="text-sm font-medium text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-lg transition-all duration-200 ease-in-out"
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
