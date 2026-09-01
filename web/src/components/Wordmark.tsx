const wordmarkSizeClasses = {
    default: ' text-base',
    heading: ' text-2xl',
    inherit: '',
};

/** Renders the LongLink wordmark. */
export function Wordmark({ size = 'default' }: { size?: 'default' | 'heading' | 'inherit' }) {
    return (
        <span
            className={`inline-flex leading-none font-semibold tracking-[-0.04em] uppercase${wordmarkSizeClasses[size]}`}
        >
            <span className="text-secondary">LONG</span>
            <span className="text-primary">LINK</span>
        </span>
    );
}
