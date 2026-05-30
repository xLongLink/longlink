import type { ReactNode } from 'react';

import { Breadcrumb } from '@/components/Breadcrumb';
import { Wordmark } from '@/components/Wordmark';
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'react-router';

type XMLProps = {
    tabs?: Record<string, string>;
    brandOnly?: boolean;
    brandHref?: string;
    children: ReactNode;
};

/** Renders the XML page shell without the user profile control. */
export default function XML({ tabs, brandOnly = false, brandHref = '/organizations', children }: XMLProps) {
    const location = useLocation();
    const tabEntries = Object.entries(tabs ?? {});
    const currentPath = `${location.pathname}${location.search}`;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="flex min-h-screen flex-col">
                <header className="bg-black text-white">
                    <div className="mx-auto w-full px-6 pb-2 pt-4">
                        <div className="flex items-center justify-between gap-4 text-white/80">
                            <div className="flex items-center gap-4">
                                {brandOnly ? (
                                    <Link to={brandHref} aria-label="LongLink home" className="inline-flex items-center">
                                        <Wordmark />
                                    </Link>
                                ) : (
                                    <Breadcrumb />
                                )}
                            </div>
                            <Link
                                to="/docs"
                                className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
                            >
                                Docs
                            </Link>
                        </div>
                    </div>

                    {brandOnly || !tabEntries.length ? null : (
                        <div className="mx-auto w-full px-6">
                            <div className="flex w-full items-center gap-2 border-b border-white/10">
                                {tabEntries.map(([label, href]) => {
                                    const targetUrl = new URL(href, `${window.location.origin}${location.pathname}`);
                                    const isActive = `${targetUrl.pathname}${targetUrl.search}` === currentPath;

                                    return (
                                        <Link
                                            key={label}
                                            to={href}
                                            replace
                                            aria-current={isActive ? 'page' : undefined}
                                            className={cn(
                                                'relative inline-flex items-center gap-1.5 rounded-md px-2 py-1 pb-1 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white',
                                                isActive &&
                                                    'text-white after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-white'
                                            )}
                                        >
                                            {label}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </header>

                <main className="mx-auto flex w-full flex-1 gap-8 p-0.5 lg:p-1">
                    <div className="flex w-full flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card/80 shadow-[0_24px_80px_rgba(0,0,0,0.12)] backdrop-blur-sm">
                        <div className="flex-1 px-6 py-4">{children}</div>
                    </div>
                </main>
            </div>
        </div>
    );
}
