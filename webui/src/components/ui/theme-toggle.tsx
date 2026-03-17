import { useTheme } from '../../hooks/useTheme';
import { cn } from '../../lib/utils';

// 太阳图标 SVG
function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="12"
        cy="12"
        r="4"
        fill="currentColor"
      />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// 月亮图标 SVG
function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

// 星星组件
function Star({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6z" />
    </svg>
  );
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "relative inline-flex h-9 w-[72px] items-center rounded-full transition-all duration-500 ease-in-out",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "overflow-hidden",
        "shadow-lg hover:shadow-xl",
        isDark
          ? 'bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 focus-visible:ring-slate-400'
          : 'bg-gradient-to-br from-sky-300 via-blue-400 to-indigo-400 focus-visible:ring-blue-400'
      )}
      title={isDark ? '切换到浅色模式' : '切换到深色模式'}
    >
      {/* 背景装饰 - 云朵 (浅色模式) */}
      <span
        className={cn(
          "absolute top-1/2 -translate-y-1/2 transition-all duration-500",
          isDark ? 'opacity-0 -translate-x-4' : 'opacity-100 translate-x-0'
        )}
      >
        <span className="absolute left-2 top-0 w-4 h-2 bg-white/40 rounded-full blur-[1px]" />
        <span className="absolute left-4 top-[-2px] w-3 h-2 bg-white/30 rounded-full blur-[1px]" />
        <span className="absolute left-3 top-1 w-5 h-2 bg-white/35 rounded-full blur-[1px]" />
      </span>

      {/* 背景装饰 - 星星 (深色模式) */}
      <span
        className={cn(
          "absolute inset-0 transition-opacity duration-500",
          isDark ? 'opacity-100' : 'opacity-0'
        )}
      >
        <Star
          className="absolute w-1.5 h-1.5 text-slate-300/60 animate-twinkle"
          style={{ top: '20%', left: '15%', animationDelay: '0s' }}
        />
        <Star
          className="absolute w-1 h-1 text-slate-400/50 animate-twinkle"
          style={{ top: '60%', left: '10%', animationDelay: '0.5s' }}
        />
        <Star
          className="absolute w-1.5 h-1.5 text-slate-200/40 animate-twinkle"
          style={{ top: '30%', left: '25%', animationDelay: '1s' }}
        />
        <Star
          className="absolute w-1 h-1 text-slate-300/30 animate-twinkle"
          style={{ top: '70%', left: '20%', animationDelay: '1.5s' }}
        />
      </span>

      {/* 左侧太阳图标区域 */}
      <span
        className={cn(
          "absolute left-0 top-0 w-1/2 h-full flex items-center justify-center",
          "transition-all duration-300"
        )}
      >
        <SunIcon
          className={cn(
            "w-4 h-4 transition-all duration-300",
            isDark
              ? 'text-slate-500/50 scale-75'
              : 'text-yellow-100 scale-100'
          )}
        />
      </span>

      {/* 右侧月亮图标区域 */}
      <span
        className={cn(
          "absolute right-0 top-0 w-1/2 h-full flex items-center justify-center",
          "transition-all duration-300"
        )}
      >
        <MoonIcon
          className={cn(
            "w-4 h-4 transition-all duration-300",
            isDark
              ? 'text-slate-300 scale-100'
              : 'text-slate-400/30 scale-75'
          )}
        />
      </span>

      {/* 滑块 */}
      <span
        className={cn(
          "absolute top-1 flex h-7 w-7 items-center justify-center rounded-full",
          "transition-all duration-500 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)]",
          "shadow-lg",
          isDark
            ? 'left-[calc(100%-32px)] bg-gradient-to-br from-slate-500 to-slate-700 shadow-slate-900/50'
            : 'left-1 bg-gradient-to-br from-yellow-300 to-orange-400 shadow-yellow-500/50'
        )}
      >
        {/* 光晕效果 */}
        <span
          className={cn(
            "absolute inset-0 rounded-full transition-opacity duration-500",
            isDark
              ? 'bg-gradient-to-br from-slate-400/20 to-slate-500/20 animate-glow-dark'
              : 'bg-gradient-to-br from-yellow-200/40 to-orange-200/40 animate-glow-light'
          )}
        />
        
        {/* 图标 */}
        <span className="relative z-10 transition-transform duration-500 ease-out">
          {isDark ? (
            <MoonIcon className="w-4 h-4 text-slate-200 drop-shadow-[0_0_4px_rgba(226,232,240,0.4)]" />
          ) : (
            <SunIcon className="w-4 h-4 text-yellow-700 drop-shadow-[0_0_4px_rgba(251,191,36,0.8)]" />
          )}
        </span>
      </span>
    </button>
  );
}
