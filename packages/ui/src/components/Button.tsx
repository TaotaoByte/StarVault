import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
          variant === 'primary' && 'bg-accent text-white hover:bg-accent-hover',
          variant === 'secondary' && 'bg-bg-tertiary text-text-primary hover:bg-border',
          variant === 'ghost' && 'bg-transparent text-text-secondary hover:bg-bg-tertiary',
          variant === 'danger' && 'bg-danger text-white hover:opacity-90',
          size === 'sm' && 'h-8 px-3 text-sm',
          size === 'md' && 'h-10 px-4',
          size === 'lg' && 'h-12 px-6 text-lg',
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
