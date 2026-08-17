import { Stack } from '@astryxdesign/core/Stack';
import { Outlet, useParams } from 'react-router';
import { TopNav } from '@astryxdesign/core/TopNav';
import { AppWindow, Settings2 } from 'lucide-react';
import { ProfileMenu } from '@/components/Profile';
import { Navigation } from '@/components/Navigation';
import TopLayout from '@/components/layouts/TopLayout';
import { useAuthenticatedUser } from '@/lib/hooks/use-user';
import { PageBreadcrumb } from '@/components/breadcrumb/Page';

/** Renders the fixed navigation around organization pages. */
export default function OrganizationLayout() {
    const { organization = '' } = useParams();

    return (
        <TopLayout
            topMenu={
                <Stack>
                    <TopNav
                        className="min-h-11 px-7"
                        endContent={<ProfileMenu user={useAuthenticatedUser()} />}
                        heading={<PageBreadcrumb />}
                        label="Main navigation"
                    />
                    <Navigation
                        tabs={[
                            { href: `/orgs/${organization}`, icon: AppWindow, label: 'Applications' },
                            { href: `/orgs/${organization}/settings`, icon: Settings2, label: 'Settings' },
                        ]}
                    />
                </Stack>
            }
        >
            <Outlet />
        </TopLayout>
    );
}
