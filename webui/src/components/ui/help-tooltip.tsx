import { ReactNode, useState } from 'react';
import { cn } from '../../lib/utils';

type TooltipProps = {
  content: string;
  children?: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
};

/**
 * 帮助提示组件 - 为小白用户提供操作指引
 */
export function HelpTooltip({ content, children, position = 'top', className }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-blue-600 dark:border-t-blue-400 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-blue-600 dark:border-b-blue-400 border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-blue-600 dark:border-l-blue-400 border-t-transparent border-b-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-blue-600 dark:border-r-blue-400 border-t-transparent border-b-transparent border-l-transparent',
  };

  return (
    <div
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children || (
        <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 flex items-center justify-center text-xs cursor-help hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors">
          ?
        </span>
      )}
      {isVisible && (
        <div
          className={cn(
            "absolute z-50 px-3 py-2 text-sm whitespace-nowrap",
            "bg-blue-600 dark:bg-blue-400 text-white dark:text-slate-900",
            "rounded-lg shadow-lg animate-in fade-in-0 zoom-in-95 duration-200",
            positionClasses[position]
          )}
        >
          {content}
          <div
            className={cn(
              "absolute w-0 h-0 border-4",
              arrowClasses[position]
            )}
          />
        </div>
      )}
    </div>
  );
}

type GuideStepProps = {
  step: number;
  title: string;
  description: string;
  icon?: string;
  isCompleted?: boolean;
  isActive?: boolean;
};

/**
 * 引导步骤组件 - 展示操作流程步骤
 */
export function GuideStep({ step, title, description, icon, isCompleted, isActive }: GuideStepProps) {
  return (
    <div className={cn(
      "flex gap-3 p-3 rounded-lg transition-colors",
      isActive && "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800",
      isCompleted && "opacity-60"
    )}>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
        isCompleted && "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300",
        isActive && "bg-blue-500 text-white",
        !isCompleted && !isActive && "bg-gray-100 dark:bg-gray-800 text-gray-500"
      )}>
        {isCompleted ? '✓' : icon || step}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className={cn(
          "font-medium text-sm",
          isActive && "text-blue-700 dark:text-blue-300",
          !isActive && "text-foreground"
        )}>
          {title}
        </h4>
        <p className="text-xs text-black mt-0.5">{description}</p>
      </div>
    </div>
  );
}

type EmptyStateProps = {
  icon?: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

/**
 * 空状态组件 - 友好的空数据提示
 */
export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      <p className="text-sm text-black mb-4 max-w-sm">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium",
            "bg-blue-500 hover:bg-blue-600 text-white",
            "transition-colors"
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

type StatusBadgeProps = {
  status: 'success' | 'warning' | 'error' | 'info' | 'loading';
  text: string;
  pulse?: boolean;
};

/**
 * 状态徽章组件 - 清晰的状态指示
 */
export function StatusBadge({ status, text, pulse }: StatusBadgeProps) {
  const statusConfig = {
    success: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', dot: 'bg-green-500' },
    warning: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', dot: 'bg-yellow-500' },
    error: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500' },
    info: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
    loading: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', dot: 'bg-gray-400' },
  };

  const config = statusConfig[status];

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
      config.bg,
      config.text
    )}>
      <span className={cn(
        "w-2 h-2 rounded-full",
        config.dot,
        pulse && "animate-pulse"
      )} />
      {text}
    </span>
  );
}

type QuickTipProps = {
  tips: string[];
  title?: string;
};

/**
 * 快速提示组件 - 显示操作小贴士
 */
export function QuickTips({ tips, title = '💡 小贴士' }: QuickTipProps) {
  if (tips.length === 0) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
      <h4 className="font-medium text-amber-800 dark:text-amber-200 text-sm mb-2">{title}</h4>
      <ul className="space-y-1">
        {tips.map((tip, index) => (
          <li key={index} className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
            <span className="text-amber-500">•</span>
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}
