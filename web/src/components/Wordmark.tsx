import type { CSSProperties } from 'react';

/** Renders the LongLink wordmark. */
export function Wordmark({ className, style }: { className?: string; style?: CSSProperties }) {
    return (
        <span
            className={[
                'inline-flex text-[length:var(--text-label-size)] leading-none font-[var(--font-weight-semibold)] tracking-[-0.04em] uppercase',
                className,
            ]
                .filter(Boolean)
                .join(' ')}
            style={style}
        >
            <span className="text-secondary">LONG</span>
            <span className="text-primary">LINK</span>
        </span>
    );
}
