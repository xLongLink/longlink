import type { ReactNode } from 'react';
import { Building2, ExternalLink, Settings2 } from 'lucide-react';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { TopNav } from '@astryxdesign/core/TopNav';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { useLocation } from 'react-router';
import { ProfileMenu } from '@/components/Profile';
import { Wordmark } from '@/components/Wordmark';
import Platform from '@/components/layouts/Platform';
import { useUserProfile } from '@/lib/hooks/use-user';

const userTabs = [
    { href: '/organizations', icon: Building2, label: 'Organizations' },
    { href: '/settings', icon: Settings2, label: 'Settings' },
] as const;

/** Renders the fixed account navigation around user pages. */
export function UserLayout({ children }: { children: ReactNode }) {
    const { pathname } = useLocation();
    const { user } = useUserProfile();

    return (
        <Platform
            topNav={
                <Stack gap={0}>
                    <TopNav
                        className="min-h-11 px-7"
                        endContent={
                            user ? (
                                <ProfileMenu />
                            ) : (
                                <Link
                                    href="/docs"
                                    color="secondary"
                                    isStandalone
                                    rel="noopener noreferrer"
                                    target="_blank"
                                >
                                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                        Documentation
                                        <ExternalLink aria-hidden="true" className="size-3 shrink-0" />
                                    </span>
                                </Link>
                            )
                        }
                        heading={
                            <Link href="/" label="LongLink home" color="inherit">
                                <Wordmark />
                            </Link>
                        }
                        label="Main navigation"
                    />
                    <Stack direction="horizontal" isScrollable paddingInline={4} width="100%">
                        <TabList
                            aria-label="Section navigation"
                            hasDivider
                            onChange={() => undefined}
                            size="sm"
                            value={pathname === '/settings' ? '/settings' : '/organizations'}
                        >
                            {userTabs.map((tab) => (
                                <Tab
                                    key={tab.label}
                                    href={tab.href}
                                    icon={<tab.icon aria-hidden="true" size={16} />}
                                    label={tab.label}
                                    value={tab.href}
                                />
                            ))}
                        </TabList>
                    </Stack>
                </Stack>
            }
        >
            {children}
        </Platform>
    );
}

/** Renders a brand-only platform shell for authentication and fallback pages. */
export function BrandLayout({
    brandHref = '/organizations',
    children,
    fillViewport = false,
}: {
    brandHref?: string;
    children: ReactNode;
    fillViewport?: boolean;
}) {
    const { user } = useUserProfile();

    return (
        <Platform
            topNav={
                <TopNav
                    className="min-h-11 px-7"
                    endContent={
                        user ? (
                            <ProfileMenu />
                        ) : (
                            <Link href="/docs" color="secondary" isStandalone rel="noopener noreferrer" target="_blank">
                                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                    Documentation
                                    <ExternalLink aria-hidden="true" className="size-3 shrink-0" />
                                </span>
                            </Link>
                        )
                    }
                    heading={
                        <Link href={brandHref} label="LongLink home" color="inherit">
                            <Wordmark />
                        </Link>
                    }
                    label="Main navigation"
                />
            }
        >
            {fillViewport ? (
                <Stack height="calc(100dvh - var(--appshell-header-height, 0px))">{children}</Stack>
            ) : (
                children
            )}
        </Platform>
    );
}
