import { useEffect, useState } from 'react';
import { Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Tooltip } from '../ui/Tooltip';
import { cn } from '../../lib/cn';

interface Breakdown {
  score: number;
  completeness: number;
  itinerary: number;
  pricing: number;
  commonItems: number;
  suggestions: string[];
}

export function QualityScoreBadge({ quotationId, className }: { quotationId: string; className?: string }) {
  const [b, setB] = useState<Breakdown | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let aborted = false;
    fetch(`/api/ai/quality-score?id=${encodeURIComponent(quotationId)}`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => { if (!aborted) setB(data.breakdown); })
      .catch(() => { /* silent */ })
      .finally(() => { if (!aborted) setLoading(false); });
    return () => { aborted = true; };
  }, [quotationId]);

  if (loading || !b) return null;

  const good = b.score >= 7.5;
  const warn = b.score >= 5 && b.score < 7.5;
  const bad = b.score < 5;

  const tip = (
    <div className="text-left">
      <div className="font-semibold mb-1">Quality breakdown</div>
      <div>Completeness: {b.completeness}/10</div>
      <div>Itinerary: {b.itinerary}/10</div>
      <div>Pricing: {b.pricing}/10</div>
      <div>Common items: {b.commonItems}/10</div>
      {b.suggestions.length > 0 && (
        <>
          <div className="font-semibold mt-2 mb-1">Top suggestions</div>
          <ul className="list-disc ml-4">
            {b.suggestions.slice(0, 3).map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </>
      )}
    </div>
  );

  return (
    <Tooltip content={tip} side="bottom">
      <Badge
        size="sm"
        variant={good ? 'success' : warn ? 'warning' : 'danger'}
        className={cn('cursor-help gap-1', className)}
      >
        {good ? <CheckCircle2 className="h-3 w-3" /> : bad ? <AlertTriangle className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
        AI {b.score}/10
      </Badge>
    </Tooltip>
  );
}
