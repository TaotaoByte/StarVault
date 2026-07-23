import { type HTMLAttributes, forwardRef } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: string;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, color, style, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        className
      )}
      style={{
        backgroundColor: color ? `${color}20` : 'var(--bg-tertiary)',
        color: color ?? 'var(--text-secondary)',
        ...style,
      }}
      {...props}
    />
  )
);
Badge.displayName = 'Badge';
