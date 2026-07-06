import { cn } from '@/lib/utils';

/** Renders the LongLink wordmark. */
export function Wordmark({ className }: { className?: string }) {
    return (
        <span className={cn('inline-flex items-center gap-2 font-semibold leading-none text-sm', className)}>
            <span className="uppercase tracking-[-0.04em]">
                <span className="text-accent">LONG</span>
                <span className="text-foreground">LINK</span>
            </span>
        </span>
    );
}
