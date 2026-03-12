import * as React from 'react';
import { cn } from '../lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-primary text-primary-foreground hover:bg-primary/90':
              variant === 'default',
            'border border-input bg-background hover:bg-accent':
              variant === 'outline',
            'hover:bg-accent hover:text-accent-foreground': variant === 'ghost',
          },
          {
            'h-8 px-3 text-sm': size === 'sm',
            'h-10 px-4 text-sm': size === 'md',
            'h-12 px-6 text-base': size === 'lg',
          },
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button };
