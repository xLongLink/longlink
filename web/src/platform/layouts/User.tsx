import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { TopNav } from '@astryxdesign/core/TopNav';
import { Outlet, useLocation } from 'react-router';
import { Building2, Settings2 } from 'lucide-react';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { Wordmark } from '@/components/Wordmark';
import { ProfileMenu } from '@/components/Profile';
import TopLayout from '@/components/layouts/TopLayout';
import { useAuthenticatedUser } from '@/lib/hooks/use-user';

/** Renders the fixed account navigation around user pages. */
export default function UserLayout() {
    const { pathname } = useLocation();
    const user = useAuthenticatedUser();

    return (
        <TopLayout
            topMenu={
                <Stack>
                    <TopNav
                        className="min-h-11 px-7"
                        endContent={<ProfileMenu user={user} />}
                        heading={
                            <Link href="/" label="LongLink home" color="inherit">
                                <Wordmark />
                            </Link>
                        }
                        label="Main navigation"
                    />
                    <Stack direction="horizontal" paddingInline={4} width="100%">
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
                </Stack>
            }
        >
            <Outlet />
        </TopLayout>
    );
}
