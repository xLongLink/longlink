import { cn } from '@/lib/utils';

/** Renders the LongLink wordmark. */
export function Wordmark({ className }: { className?: string }) {
    return (
        <span className={cn('inline-flex text-sm font-semibold uppercase leading-none tracking-[-0.04em]', className)}>
            <span className="text-muted-foreground">LONG</span>
            <span className="text-foreground">LINK</span>
        </span>
    );
}
