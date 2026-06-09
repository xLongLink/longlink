import type { ReactNode } from 'react';

import { Breadcrumb } from '@/components/Breadcrumb';
import { UserProfile } from '@/components/Profile';
import { Wordmark } from '@/components/Wordmark';
import { cn } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';
import { Link, useLocation } from 'react-router';

import TopLayout from './TopLayout';

type LayoutProps = {
    tabs?: Record<string, string>;
    brandOnly?: boolean;
    brandHref?: string;
    children: ReactNode;
};

/** Renders the XML build shell with SDK-specific header chrome. */
export default function Layout({ tabs, brandOnly = false, brandHref = '/organizations', children }: LayoutProps) {
    const location = useLocation();
    const tabEntries = Object.entries(tabs ?? {});
    const currentPath = `${location.pathname}${location.search}`;
    const isSdkMode = import.meta.env.MODE === 'sdk';

    const header = (
        <>
            <div className="mx-auto w-full px-6 pb-2 pt-4 text-white/80">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {brandOnly ? (
                            <Link to={brandHref} aria-label="LongLink home" className="inline-flex items-center">
                                <Wordmark />
                            </Link>
                        ) : (
                            <Breadcrumb />
                        )}
                    </div>
                    {isSdkMode ? (
                        <a
                            href="https://longlink.dev/docs"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
                        >
                            Docs
                            <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                        </a>
                    ) : (
                        <UserProfile />
                    )}
                </div>
            </div>

            {brandOnly || !tabEntries.length ? null : (
                <div className="mx-auto w-full px-6 pb-0 pt-0">
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
        </>
    );

    return (
        <TopLayout header={header}>{children}</TopLayout>
    );
}
