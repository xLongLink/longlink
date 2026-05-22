import { cn } from '@/lib/utils';

type WordmarkProps = {
    className?: string;
    compact?: boolean;
    textClassName?: string;
};

/** Renders the LongLink wordmark with an optional compact variant. */
export function Wordmark({ className, compact = false, textClassName }: WordmarkProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center font-semibold leading-none',
                compact ? 'gap-1.5' : 'gap-2',
                className
            )}
        >
            <span className={cn('uppercase tracking-[-0.04em]', compact ? 'text-xs' : '', textClassName)}>
                <span className="text-accent">LONG</span>
                <span className="text-white">LINK</span>
            </span>
        </span>
    );
}
