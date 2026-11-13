import { cn } from 'cn';
import * as React from 'react';

function InlineCode({ className, ...props }: React.ComponentProps<'code'>) {
    // Keep inline code readable without preventing long tokens from wrapping.
    return (
        <code
            className={cn(
                'relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm leading-[inherit] font-semibold text-foreground wrap-break-word [word-break:break-word]',
                className
            )}
            {...props}
        />
    );
}

export { InlineCode };
