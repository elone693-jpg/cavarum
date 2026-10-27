import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// 16 px minimum : évite le zoom automatique d'iOS à la saisie.
const CONTROL =
  'min-h-11 w-full rounded-[10px] border border-border-strong bg-background/60 px-3.5 text-base sm:text-[15px] ' +
  'placeholder:text-muted-foreground/70 transition-colors hover:border-primary/40 ' +
  'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-0';

type FieldProps = { label: string; error?: string; hint?: ReactNode };

export const TextField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const generated = useId();
    const inputId = id ?? generated;
    return (
      <div className="space-y-1.5">
        <label htmlFor={inputId} className="text-[13px] font-medium text-foreground/90">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(CONTROL, error && 'border-destructive hover:border-destructive', className)}
          {...props}
        />
        {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
        {error && (
          <p id={`${inputId}-error`} className="text-[13px] text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  },
);
TextField.displayName = 'TextField';

export function SelectField({
  label,
  className,
  children,
  id,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const generated = useId();
  const selectId = id ?? generated;
  return (
    <div className="space-y-1.5">
      <label htmlFor={selectId} className="text-[13px] font-medium text-foreground/90">
        {label}
      </label>
      <select id={selectId} className={cn(CONTROL, 'appearance-auto', className)} {...props}>
        {children}
      </select>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-[10px] border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
      {message}
    </p>
  );
}
