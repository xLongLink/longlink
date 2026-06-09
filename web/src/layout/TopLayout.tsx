import { useEffect, type HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type TopLayoutProps = HTMLAttributes<HTMLDivElement> & {
    header: ReactNode;
    children: ReactNode;
};

/** Renders the shared top layout shell. */
function TopLayout({ className, header, children, ...props }: TopLayoutProps) {
    // Keep the viewport gutter and scrollbar track on the same black surface as the shell.
    useEffect(() => {
        const root = document.documentElement;
        const body = document.body;
        const previousRootBackground = root.style.backgroundColor;
        const previousBodyBackground = body.style.backgroundColor;

        root.style.backgroundColor = 'black';
        body.style.backgroundColor = 'black';

        return () => {
            root.style.backgroundColor = previousRootBackground;
            body.style.backgroundColor = previousBodyBackground;
        };
    }, []);

    return (
        <div className={cn('min-h-screen bg-black text-foreground', className)} {...props}>
            <div className="flex min-h-screen flex-col">
                <header className="bg-black text-white">{header}</header>
                <main className="mx-auto flex w-full flex-1 gap-8 bg-black p-0.5 lg:p-1">
                    <div className="flex w-full flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card px-6 py-4 shadow-[0_24px_80px_rgba(0,0,0,0.12)]">
                        <div className="flex-1">{children}</div>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default TopLayout;
