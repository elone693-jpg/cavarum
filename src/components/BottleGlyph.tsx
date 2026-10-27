import { cn } from '@/lib/utils';

/** Silhouette de bouteille de rhum, utilisée quand aucune photo n'est disponible. */
export function BottleGlyph({ className, tone = 'primary' }: { className?: string; tone?: 'primary' | 'muted' }) {
  const color = tone === 'primary' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))';
  return (
    <svg viewBox="0 0 48 96" className={cn('h-full w-auto', className)} aria-hidden fill="none">
      <path
        d="M19 4h10v4l-1 2v20c0 3 9 7 9 16v42a4 4 0 0 1-4 4H15a4 4 0 0 1-4-4V46c0-9 9-13 9-16V10l-1-2V4Z"
        fill={color}
        fillOpacity="0.14"
        stroke={color}
        strokeOpacity="0.7"
        strokeWidth="1.5"
      />
      <rect x="14" y="54" width="20" height="22" rx="1.5" fill={color} fillOpacity="0.22" stroke={color} strokeOpacity="0.6" />
      <path d="M17 60h14M17 70h14" stroke={color} strokeOpacity="0.55" />
    </svg>
  );
}
