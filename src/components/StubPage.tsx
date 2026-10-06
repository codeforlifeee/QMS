import { ArrowLeft, BarChart3, Calendar, Package, Receipt, Sparkles } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';

const ICONS = { analytics: BarChart3, calendar: Calendar, catalog: Package, invoices: Receipt, sparkles: Sparkles } as const;
type IconKey = keyof typeof ICONS;

export interface StubPageProps {
  iconName: IconKey;
  title: string;
  description: string;
  bullets?: string[];
  roadmap?: string;
}

export function StubPage({ iconName, title, description, bullets, roadmap = 'Planned for an upcoming release.' }: StubPageProps) {
  const Icon = ICONS[iconName];
  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[color:var(--color-brand-orange)]/15 to-[color:var(--color-brand-teal)]/15 text-[color:var(--color-brand-orange)]">
          <Icon size={28} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-heading text-2xl font-bold text-[color:var(--color-ink)]">{title}</h1>
            <Badge variant="warning" size="sm">Coming soon</Badge>
          </div>
          <p className="mt-1 text-sm text-[color:var(--color-muted-ink)]">{description}</p>
        </div>
      </div>

      {bullets && bullets.length > 0 && (
        <Card className="mb-4">
          <h2 className="font-heading text-sm font-semibold text-[color:var(--color-ink)] mb-3">What&apos;s planned</h2>
          <ul className="space-y-2">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-[color:var(--color-muted-ink)]">
                <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--color-brand-orange)]" />
                {b}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card variant="flat" className="bg-[color:var(--color-tint)] border-dashed">
        <p className="text-sm text-[color:var(--color-muted-ink)]">{roadmap}</p>
      </Card>

      <div className="mt-6">
        <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => (window.location.href = '/')}>
          Back to dashboard
        </Button>
      </div>
    </div>
  );
}
