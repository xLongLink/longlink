import { AppWindow, ExternalLink, Settings2 } from 'lucide-react';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { TopNav } from '@astryxdesign/core/TopNav';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { Outlet, useLocation, useParams } from 'react-router';
import { ProfileMenu } from '@/components/Profile';
import Platform from '@/components/layouts/Platform';
import { PageBreadcrumb } from '@/components/breadcrumb/Page';
import { useUserProfile } from '@/lib/hooks/use-user';

/** Renders the fixed navigation around organization pages. */
export default function OrganizationLayout() {
    const { pathname } = useLocation();
    const { user } = useUserProfile();
    const { organization = '' } = useParams();
    const applicationHref = `/orgs/${organization}`;
    const settingsHref = `${applicationHref}/settings`;

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
                        heading={<PageBreadcrumb />}
                        label="Main navigation"
                    />
                    {user ? (
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
                    ) : null}
                </Stack>
            }
        >
            <Outlet />
        </Platform>
    );
}
