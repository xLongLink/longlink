import { Outlet } from 'react-router';
import { Stack } from '@astryxdesign/core/Stack';
import { TopNav } from '@astryxdesign/core/TopNav';
import { Auth } from '@/components/Auth';
import { ProfileMenu } from '@/components/Profile';
import { Navigation } from '@/components/Navigation';
import TopLayout from '@/components/layouts/TopLayout';
import { administratorTabs } from '@/lib/administrator';
import { PageContainer } from '@/components/PageContainer';
import { useAuthenticatedUser } from '@/lib/hooks/use-user';
import { PageBreadcrumb } from '@/components/breadcrumb/Page';

/** Renders the authorized admin shell with tabbed navigation. */
export default function Admin() {
    return (
        <Auth administrator>
            <AdminContent />
        </Auth>
    );
}

/** Renders administrator navigation after the administrator guard passes. */
function AdminContent() {
    const user = useAuthenticatedUser();

    return (
        <TopLayout
            topMenu={
                <Stack>
                    <TopNav
                        className="min-h-11 px-7"
                        endContent={<ProfileMenu user={user} />}
                        heading={<PageBreadcrumb />}
                        label="Main navigation"
                    />
                    <Navigation tabs={administratorTabs} />
                </Stack>
            }
        >
            <PageContainer gap={8}>
                <Outlet />
            </PageContainer>
        </TopLayout>
    );
}
