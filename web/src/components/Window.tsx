import type { ReactNode } from 'react';

type WindowProps = {
    xml: string;
    children: ReactNode;
};

/** Renders the playground window frame only. */
export function Window({ xml, children }: WindowProps) {
    return (
        <div className="relative h-full min-h-[28rem] overflow-hidden rounded-2xl border border-border bg-card/80 shadow-lg shadow-black/10 ring-1 ring-border/60" data-xml={xml}>
            <div className="origin-top-left scale-[0.9] w-[111.111%] px-6">{children}</div>
        </div>
    );
}
