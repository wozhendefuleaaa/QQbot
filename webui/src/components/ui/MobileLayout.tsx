import * as React from "react"
import { cn } from "@/lib/utils"

// 移动端视图状态类型
export type MobileView = 'main' | 'detail' | 'overlay'

// 移动端布局上下文
interface MobileLayoutContextValue {
  // 当前视图状态
  view: MobileView
  setView: (view: MobileView) => void
  
  // 是否为移动端
  isMobile: boolean
  
  // 详情面板标题
  detailTitle?: string
  setDetailTitle: (title?: string) => void
  
  // 详情面板返回回调
  onBack?: () => void
  setOnBack: (callback?: () => void) => void
  
  // 是否显示底部导航
  showBottomNav: boolean
  setShowBottomNav: (show: boolean) => void
}

const MobileLayoutContext = React.createContext<MobileLayoutContextValue | null>(null)

export function useMobileLayout() {
  const context = React.useContext(MobileLayoutContext)
  if (!context) {
    throw new Error('useMobileLayout must be used within MobileLayoutProvider')
  }
  return context
}

// 移动端布局Provider
interface MobileLayoutProviderProps {
  children: React.ReactNode
}

export function MobileLayoutProvider({ children }: MobileLayoutProviderProps) {
  const [view, setView] = React.useState<MobileView>('main')
  const [detailTitle, setDetailTitle] = React.useState<string>()
  const [onBack, setOnBack] = React.useState<() => void>()
  const [showBottomNav, setShowBottomNav] = React.useState(true)
  
  // 检测是否为移动端
  const [isMobile, setIsMobile] = React.useState(false)
  
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  const value: MobileLayoutContextValue = {
    view,
    setView,
    isMobile,
    detailTitle,
    setDetailTitle,
    onBack,
    setOnBack,
    showBottomNav,
    setShowBottomNav,
  }
  
  return (
    <MobileLayoutContext.Provider value={value}>
      {children}
    </MobileLayoutContext.Provider>
  )
}

// 移动端主内容区域
interface MobileMainProps extends React.HTMLAttributes<HTMLDivElement> {}

export function MobileMain({ className, children, ...props }: MobileMainProps) {
  const { view } = useMobileLayout()
  
  return (
    <div
      className={cn(
        "flex-1 flex flex-col min-h-0 overflow-hidden",
        view === 'detail' && "hidden md:flex",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// 移动端详情面板
interface MobileDetailProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  showBack?: boolean
  onBack?: () => void
}

export function MobileDetail({ 
  className, 
  children, 
  title: propTitle,
  showBack = true,
  onBack: propOnBack,
  ...props 
}: MobileDetailProps) {
  const { view, detailTitle, onBack: contextOnBack, setView, setShowBottomNav } = useMobileLayout()
  
  const handleBack = () => {
    if (propOnBack) {
      propOnBack()
    } else if (contextOnBack) {
      contextOnBack()
    } else {
      setView('main')
    }
  }
  
  // 进入详情时隐藏底部导航
  React.useEffect(() => {
    if (view === 'detail') {
      setShowBottomNav(false)
    }
    return () => setShowBottomNav(true)
  }, [view, setShowBottomNav])
  
  return (
    <div
      className={cn(
        "absolute inset-0 z-30 bg-background flex flex-col",
        "md:relative md:z-auto md:flex-1",
        view === 'main' && "hidden md:flex",
        "animate-slide-in-right md:animate-none",
        className
      )}
      {...props}
    >
      {/* 移动端详情头部 */}
      <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b bg-card shrink-0 safe-area-inset-top">
        {showBack && (
          <button
            onClick={handleBack}
            className="flex items-center justify-center w-8 h-8 -ml-1 rounded-lg hover:bg-muted active:scale-95 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <h2 className="text-base font-semibold flex-1 truncate">{detailTitle || propTitle}</h2>
      </header>
      
      {/* 内容区域 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  )
}

// 移动端页面容器
interface MobilePageProps extends React.HTMLAttributes<HTMLDivElement> {
  // 是否显示内边距
  noPadding?: boolean
}

export function MobilePage({ className, noPadding, children, ...props }: MobilePageProps) {
  return (
    <div
      className={cn(
        "flex-1 flex flex-col min-h-0 overflow-hidden",
        !noPadding && "p-4 lg:p-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// 移动端卡片容器
interface MobileCardProps extends React.HTMLAttributes<HTMLDivElement> {
  // 是否全宽
  fullWidth?: boolean
}

export function MobileCard({ className, fullWidth, children, ...props }: MobileCardProps) {
  return (
    <div
      className={cn(
        "bg-card rounded-xl border shadow-sm",
        "md:rounded-2xl",
        !fullWidth && "mx-4 md:mx-0",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// 移动端列表项
interface MobileListItemProps extends React.HTMLAttributes<HTMLDivElement> {
  // 是否选中
  active?: boolean
  // 是否显示右边箭头
  showArrow?: boolean
  // 左侧图标
  icon?: React.ReactNode
  // 右侧内容
  right?: React.ReactNode
  // 点击回调
  onClick?: () => void
}

export function MobileListItem({
  className,
  active,
  showArrow,
  icon,
  right,
  onClick,
  children,
  ...props
}: MobileListItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3",
        "transition-colors cursor-pointer",
        "active:bg-muted/50 md:hover:bg-muted/50",
        active && "bg-primary/5",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
      {...props}
    >
      {icon && (
        <span className="flex-shrink-0 text-lg">{icon}</span>
      )}
      <div className="flex-1 min-w-0">{children}</div>
      {right && (
        <span className="flex-shrink-0 text-black text-sm">{right}</span>
      )}
      {showArrow && (
        <svg className="w-4 h-4 text-black flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </div>
  )
}

// 移动端分段控制器
interface MobileSegmentedControlProps {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function MobileSegmentedControl({
  options,
  value,
  onChange,
  className,
}: MobileSegmentedControlProps) {
  return (
    <div className={cn("flex bg-muted/50 rounded-lg p-1", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          className={cn(
            "flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all",
            value === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-black hover:text-foreground"
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

// 移动端空状态
interface MobileEmptyProps {
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
}

export function MobileEmpty({ icon, title, description, action }: MobileEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && <span className="text-4xl mb-3">{icon}</span>}
      <h3 className="text-base font-medium text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-black mt-1 max-w-[240px]">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// 移动端底部动作面板
interface MobileBottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export function MobileBottomSheet({ open, onClose, title, children }: MobileBottomSheetProps) {
  if (!open) return null
  
  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
      />
      
      {/* 内容面板 */}
      <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl animate-slide-up safe-area-inset-bottom">
        {/* 拖动条 */}
        <div className="flex justify-center py-2">
          <div className="w-8 h-1 bg-muted-foreground/30 rounded-full" />
        </div>
        
        {/* 标题 */}
        {title && (
          <div className="px-4 pb-2">
            <h3 className="text-base font-semibold">{title}</h3>
          </div>
        )}
        
        {/* 内容 */}
        <div className="px-4 pb-4 max-h-[60vh] overflow-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
