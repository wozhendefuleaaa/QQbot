import { useTheme } from '../../hooks/useTheme';
import { cn } from '../../lib/utils';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        theme === 'dark' 
          ? 'bg-slate-700' 
          : 'bg-slate-200'
      )}
      title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
    >
      {/* 滑块 */}
      <span
        className={cn(
          "inline-block h-6 w-6 transform rounded-full transition-transform duration-300",
          "flex items-center justify-center text-sm",
          theme === 'dark' 
            ? 'translate-x-7 bg-slate-900' 
            : 'translate-x-1 bg-white shadow'
        )}
      >
        {theme === 'dark' ? '🌙' : '☀️'}
      </span>
    </button>
  );
}
