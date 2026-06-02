import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type SideLayoutProps = HTMLAttributes<HTMLElement> & {
    header: ReactNode;
    children: ReactNode;
};

/** Renders the shared side layout shell. */
function SideLayout({ className, header, children, ...props }: SideLayoutProps) {
    return (
        <aside className={cn('flex h-full w-64 flex-col border-r border-border bg-card/80', className)} {...props}>
            <div className="border-b border-border px-3 py-3">{header}</div>
            <div className="min-h-0 flex-1 px-3 pb-3">{children}</div>
        </aside>
    );
}

export default SideLayout;
