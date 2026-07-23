type WordmarkProps = {
    className?: string;
    size?: 'default' | 'heading';
};

/** Renders the LongLink wordmark. */
export function Wordmark({ className, size = 'default' }: WordmarkProps) {
    return (
        <span
            className={[
                'inline-flex leading-none font-semibold tracking-[-0.04em] uppercase',
                size === 'heading' ? 'text-2xl' : 'text-base',
                className,
            ]
                .filter(Boolean)
                .join(' ')}
        >
            <span className="text-secondary">LONG</span>
            <span className="text-primary">LINK</span>
        </span>
    );
}
