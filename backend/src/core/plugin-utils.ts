import { CommandDefinition } from './plugin-types.js';

function matchesCronField(field: string, value: number, min: number, max: number): boolean {
  if (field === '*') return true;

  return field.split(',').some((part) => {
    const trimmed = part.trim();
    if (!trimmed) return false;

    if (trimmed.includes('/')) {
      const [base, stepRaw] = trimmed.split('/');
      const step = Number(stepRaw);
      if (!Number.isFinite(step) || step <= 0) return false;

      const [rangeStart, rangeEnd] =
        base === '*' || !base
          ? [min, max]
          : base.includes('-')
            ? base.split('-').map(Number)
            : [Number(base), max];

      if (!Number.isFinite(rangeStart) || !Number.isFinite(rangeEnd)) return false;
      if (value < rangeStart || value > rangeEnd) return false;
      return (value - rangeStart) % step === 0;
    }

    if (trimmed.includes('-')) {
      const [start, end] = trimmed.split('-').map(Number);
      if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
      return value >= start && value <= end;
    }

    const num = Number(trimmed);
    return Number.isFinite(num) && value === num;
  });
}

export function matchesCronPattern(pattern: string, date: Date): boolean {
  const fields = pattern.trim().split(/\s+/);
  if (fields.length !== 5) return false;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = fields;
  // date.getDay() 返回 0(周日)~6(周六)，cron 中 0 和 7 都表示周日
  const normalizedDowField = dayOfWeek.replace(/\b7\b/g, '0');
  return (
    matchesCronField(minute, date.getMinutes(), 0, 59) &&
    matchesCronField(hour, date.getHours(), 0, 23) &&
    matchesCronField(dayOfMonth, date.getDate(), 1, 31) &&
    matchesCronField(month, date.getMonth() + 1, 1, 12) &&
    matchesCronField(normalizedDowField, date.getDay(), 0, 6)
  );
}

export function generateHelpText(commands: Array<{ name: string; description: string; usage?: string }>): string {
  if (commands.length === 0) return '📋 暂无可用命令';

  return ['📋 可用命令列表：']
    .concat(
      commands.map(
        (cmd) =>
          `  ${cmd.name}${cmd.usage ? ` ${cmd.usage}` : ''} — ${cmd.description || '暂无说明'}`,
      ),
    )
    .join('\n');
}

export function buildCommandList(
  plugins: Array<{ id: string; name: string; commands?: CommandDefinition[] }>,
  options: { prefix?: string; enabledOnly?: boolean } = {},
): Array<{ name: string; description: string; usage?: string; pluginName: string }> {
  const { prefix = '/' } = options;

  return plugins.flatMap((plugin) =>
    (plugin.commands || []).map((cmd) => ({
      name: prefix + cmd.name,
      description: cmd.description || '',
      usage: cmd.usage,
      pluginName: plugin.name,
    })),
  );
}

export const COMMAND_COOLDOWN_DEFAULT_MS = 3000;
export const COMMAND_COOLDOWN_MAX_MS = 60000;