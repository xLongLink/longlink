import type { ReactNode } from 'react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { UserProfile } from '@/components/Profile';
import { Wordmark } from '@/components/Wordmark';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { ExternalLink, type LucideIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import TopLayout from './TopLayout';

type LayoutTab = {
    href: string;
    active?: boolean;
    icon?: LucideIcon;
};

type LayoutProps = {
    tabs?: Record<string, string | LayoutTab>;
    brandOnly?: boolean;
    brandHref?: string;
    children: ReactNode;
};

/** Renders the XML build shell with SDK-specific header chrome. */
export default function Layout({ tabs, brandOnly = false, brandHref = '/organizations', children }: LayoutProps) {
    const { t } = useTranslation();
    const location = useLocation();
    const tabEntries = Object.entries(tabs ?? {});
    const currentPath = `${location.pathname}${location.search}`;
    const isSdkMode = import.meta.env.MODE === 'sdk';

    const header = (
        <>
            <div className="mx-auto w-full px-6 pb-2 pt-4 text-foreground/80">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {isSdkMode ? (
                            <a
                                href="https://longlink.dev"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={t('common.longlinkHome')}
                                className="inline-flex items-center"
                            >
                                <Wordmark />
                            </a>
                        ) : brandOnly ? (
                            <Link
                                to={brandHref}
                                aria-label={t('common.longlinkHome')}
                                className="inline-flex items-center"
                            >
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
                            className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
                        >
                            {t('common.documentation')}
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
                        {tabEntries.map(([label, tab]) => {
                            const href = typeof tab === 'string' ? tab : tab.href;
                            const active = typeof tab === 'string' ? undefined : tab.active;
                            const Icon = typeof tab === 'string' ? undefined : tab.icon;
                            const targetUrl = new URL(href, `${window.location.origin}${location.pathname}`);
                            const isActive = active ?? `${targetUrl.pathname}${targetUrl.search}` === currentPath;

                            return (
                                <Link
                                    key={label}
                                    to={href}
                                    replace
                                    aria-current={isActive ? 'page' : undefined}
                                    className={cn(
                                        'relative inline-flex items-center gap-1.5 rounded-md px-2 py-1 pb-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground',
                                        isActive &&
                                            'text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-foreground'
                                    )}
                                >
                                    {Icon ? <Icon className="size-4 shrink-0" aria-hidden={true} /> : null}
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
        <TopLayout header={header}>
            <div className={cn('mx-auto flex w-full max-w-[1000px] flex-1 flex-col', isSdkMode && 'min-h-full')}>
                {children}
            </div>
        </TopLayout>
    );
}
