import { Stack } from '@astryxdesign/core/Stack';
import { TopNav } from '@astryxdesign/core/TopNav';
import { AppWindow, Settings2 } from 'lucide-react';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { Outlet, useLocation, useParams } from 'react-router';
import { ProfileMenu } from '@/components/Profile';
import Platform from '@/components/layouts/Platform';
import { useAuthenticatedUser } from '@/lib/hooks/use-user';
import { PageBreadcrumb } from '@/components/breadcrumb/Page';

/** Renders the fixed navigation around organization pages. */
export default function OrganizationLayout() {
    const { pathname } = useLocation();
    const user = useAuthenticatedUser();
    const { organization = '' } = useParams();
    const applicationHref = `/orgs/${organization}`;
    const settingsHref = `${applicationHref}/settings`;

    return (
        <Platform
            topNav={
                <Stack gap={0}>
                    <TopNav
                        className="min-h-11 px-7"
                        endContent={<ProfileMenu user={user} />}
                        heading={<PageBreadcrumb />}
                        label="Main navigation"
                    />
                    <Stack direction="horizontal" isScrollable paddingInline={4} width="100%">
                        <TabList
                            aria-label="Section navigation"
                            hasDivider
                            onChange={() => undefined}
                            size="sm"
                            value={pathname === settingsHref ? settingsHref : applicationHref}
                        >
                            <Tab
                                href={applicationHref}
                                icon={<AppWindow aria-hidden="true" size={16} />}
                                label="Applications"
                                value={applicationHref}
                            />
                            <Tab
                                href={settingsHref}
                                icon={<Settings2 aria-hidden="true" size={16} />}
                                label="Settings"
                                value={settingsHref}
                            />
                        </TabList>
                    </Stack>
                </Stack>
            }
        >
            <Outlet />
        </Platform>
    );
}
