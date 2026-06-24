import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type TopLayoutProps = HTMLAttributes<HTMLDivElement> & {
    header: ReactNode;
    children: ReactNode;
};

/** Renders the shared top layout shell. */
function TopLayout({ className, header, children, ...props }: TopLayoutProps) {
    return (
        <div className={cn('min-h-screen bg-background text-foreground', className)} {...props}>
            <div className="flex min-h-screen flex-col">
                <header className="bg-background text-foreground">{header}</header>
                <main className="mx-auto flex w-full flex-1 gap-8 bg-background p-0.5 lg:p-1">
                    <div className="flex w-full flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card px-6 py-4 shadow-[0_24px_80px_rgba(0,0,0,0.12)]">
                        <div className="flex min-h-full flex-1 flex-col">{children}</div>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default TopLayout;
