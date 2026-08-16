import { Building2, ExternalLink, Settings2 } from 'lucide-react';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { TopNav } from '@astryxdesign/core/TopNav';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { Outlet, useLocation } from 'react-router';
import { ProfileMenu } from '@/components/Profile';
import { Wordmark } from '@/components/Wordmark';
import Platform from '@/components/layouts/Platform';
import { useUserProfile } from '@/lib/hooks/use-user';

/** Renders the signed-in profile menu or documentation link in a top navigation. */
function AccountAction({ isSignedIn }: { isSignedIn: boolean }) {
    if (isSignedIn) {
        return <ProfileMenu />;
    }

    return (
        <Link href="/docs" color="secondary" isStandalone rel="noopener noreferrer" target="_blank">
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                Documentation
                <ExternalLink aria-hidden="true" className="size-3 shrink-0" />
            </span>
        </Link>
    );
}

/** Renders the fixed account navigation around user pages. */
export default function UserLayout() {
    const { pathname } = useLocation();
    const { user } = useUserProfile();

    return (
        <Platform
            topNav={
                <Stack gap={0}>
                    <TopNav
                        className="min-h-11 px-7"
                        endContent={<AccountAction isSignedIn={Boolean(user)} />}
                        heading={
                            <Link href="/" label="LongLink home" color="inherit">
                                <Wordmark />
                            </Link>
                        }
                        label="Main navigation"
                    />
                    {user ? (
                        <Stack direction="horizontal" isScrollable paddingInline={4} width="100%">
                            <TabList
                                aria-label="Section navigation"
                                hasDivider
                                onChange={() => undefined}
                                size="sm"
                                value={pathname === '/settings' ? '/settings' : '/organizations'}
                            >
                                <Tab
                                    href="/organizations"
                                    icon={<Building2 aria-hidden="true" size={16} />}
                                    label="Organizations"
                                    value="/organizations"
                                />
                                <Tab
                                    href="/settings"
                                    icon={<Settings2 aria-hidden="true" size={16} />}
                                    label="Settings"
                                    value="/settings"
                                />
                            </TabList>
                        </Stack>
                    ) : null}
                </Stack>
            }
        >
            <Outlet />
        </Platform>
    );
}
