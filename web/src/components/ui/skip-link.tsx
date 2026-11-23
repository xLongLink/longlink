import type { RefObject } from 'react';

export function SkipLink({
    destinationId,
    mainRef,
    className
}: {
    destinationId: string;
    mainRef: RefObject<HTMLElement | null>;
    className: string;
}) {
    return (
        <a className={className} href={`#${destinationId}`} onClick={() => mainRef.current?.focus()}>
            Skip to content
        </a>
    );
}
