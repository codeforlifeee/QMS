import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from '../../lib/cn';

export interface DonutSlice { name: string; value: number }

const PALETTE = ['#FF5B04', '#075056', '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899'];

export function DonutChart({
  data,
  centerLabel,
  centerValue,
  className,
}: {
  data: DonutSlice[];
  centerLabel?: string;
  centerValue?: string | number;
  className?: string;
}) {
  const total = data.reduce((a, b) => a + b.value, 0);
  const nonZero = data.filter((d) => d.value > 0);
  return (
    <div className={cn('flex gap-4 items-center', className)}>
      <div className="relative h-36 w-36 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={nonZero.length ? nonZero : [{ name: 'empty', value: 1 }]}
              dataKey="value"
              innerRadius={44}
              outerRadius={66}
              strokeWidth={0}
              startAngle={90}
              endAngle={-270}
              isAnimationActive={false}
            >
              {(nonZero.length ? nonZero : [{ name: 'empty', value: 1 }]).map((_, i) => (
                <Cell key={i} fill={nonZero.length ? PALETTE[i % PALETTE.length] : 'var(--color-tint)'} />
              ))}
            </Pie>
            {nonZero.length > 0 && <Tooltip />}
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {centerValue !== undefined && (
            <div className="font-heading text-xl font-bold text-[color:var(--color-ink)] tabular-nums">{centerValue}</div>
          )}
          {centerLabel && <div className="text-[10px] uppercase tracking-wide text-[color:var(--color-muted-ink)]">{centerLabel}</div>}
        </div>
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        {nonZero.length === 0 ? (
          <div className="text-xs text-[color:var(--color-muted-ink)]">No data yet</div>
        ) : (
          nonZero.map((d, i) => (
            <div key={d.name} className="flex items-center gap-2 text-xs min-w-0">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
              <span className="flex-1 truncate text-[color:var(--color-ink)]">{d.name}</span>
              <span className="tabular-nums text-[color:var(--color-muted-ink)]">
                {d.value} <span className="opacity-60">({total ? Math.round((d.value / total) * 100) : 0}%)</span>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
