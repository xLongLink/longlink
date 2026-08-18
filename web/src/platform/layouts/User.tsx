import { Outlet } from 'react-router';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { TopNav } from '@astryxdesign/core/TopNav';
import { Building2, Settings2 } from 'lucide-react';
import { Wordmark } from '@/components/Wordmark';
import { ProfileMenu } from '@/components/Profile';
import { Navigation } from '@/components/Navigation';
import TopLayout from '@/components/layouts/TopLayout';
import { useAuthenticatedUser } from '@/lib/hooks/use-user';

/** Renders the fixed account navigation around user pages. */
export default function UserLayout() {
    return (
        <TopLayout
            topMenu={
                <Stack>
                    <TopNav
                        className="min-h-11 px-7"
                        endContent={<ProfileMenu user={useAuthenticatedUser()} />}
                        heading={
                            <Link href="/" label="LongLink home" color="inherit">
                                <Wordmark />
                            </Link>
                        }
                        label="Main navigation"
                    />
                    <Navigation
                        tabs={[
                            { href: '/user/organizations', icon: Building2, label: 'Organizations' },
                            { href: '/user/settings', icon: Settings2, label: 'Settings' },
                        ]}
                    />
                </Stack>
            }
        >
            <Outlet />
        </TopLayout>
    );
}
