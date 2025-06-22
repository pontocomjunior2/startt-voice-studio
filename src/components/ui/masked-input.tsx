import * as React from 'react';
import { IMaskInput } from 'react-imask';
import { cn } from '@/lib/utils';

interface MaskedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mask: any;
}

const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ className, mask, ...props }, ref) => {
    return (
      <IMaskInput
        mask={mask}
        radix="."
        inputRef={ref as any}
        {...props as any}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-base text-foreground shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
      />
    );
  }
);
MaskedInput.displayName = 'MaskedInput';

export { MaskedInput }; 