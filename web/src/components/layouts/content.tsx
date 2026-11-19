import type { ReactNode } from 'react';

/** Pins the card surface to the viewport while its content scrolls with the document. */
export default function Content({ children, toolbar }: { children: ReactNode; toolbar?: ReactNode }) {
    return (
        <div
            className="shell-content relative isolate grid min-h-(--shell-height) min-w-0 grid-cols-[minmax(0,1fr)]"
            data-toolbar={toolbar ? true : undefined}
        >
            <div
                aria-hidden="true"
                className="pointer-events-none sticky top-[var(--\_app-shell-header-height,0px)] z-0 col-start-1 row-start-1 h-(--shell-height) self-start bg-background p-2"
            >
                <div className="h-full rounded-xl bg-card" />
            </div>
            <div className="relative z-10 col-start-1 row-start-1 flex min-w-0 flex-col self-start p-2">
                <div className="sticky top-[calc(var(--\_app-shell-header-height,0px)+var(--spacing)*2)] z-20 shrink-0 rounded-t-xl bg-card">
                    {toolbar}
                </div>
                {children}
            </div>
            <div
                aria-hidden="true"
                className="pointer-events-none sticky top-[var(--\_app-shell-header-height,0px)] z-20 col-start-1 row-start-1 h-(--shell-height) self-start rounded-[calc(var(--radius-xl)+var(--spacing)*2)] border-8 border-background"
            />
        </div>
    );
}
