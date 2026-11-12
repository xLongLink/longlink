import type { z } from 'zod';
import { useState } from 'react';
import { useLocation } from 'react-router';
import AppearanceSettings from './Appearance';
import { Text } from '@/components/astryx/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Stack } from '@/components/astryx/Stack';
import { UserRound, Building2 } from 'lucide-react';
import { Divider } from '@/components/astryx/Divider';
import { Heading } from '@/components/astryx/Heading';
import { ApiBoundary } from '@/components/ApiBoundary';
import { TextInput } from '@/components/astryx/TextInput';
import { PageContainer } from '@/components/PageContainer';
import OrganizationManagement from './OrganizationManagement';
import { Layout, LayoutPanel } from '@/components/astryx/Layout';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { useUpdateUser, useAuthenticatedUser } from '@/lib/hooks/use-user';
import { SideNav, SideNavItem, SideNavSection } from '@/components/astryx/SideNav';

/** Renders account metadata and resets drafts when the authenticated identity changes. */
export default function Settings() {
    const user = useAuthenticatedUser();

    return (
        <PageContainer padding={2}>
            <title>Account Settings | LongLink</title>
            <SettingsPage key={user.id} user={user} />
        </PageContainer>
    );
}

/** Edits the authenticated profile and manages owned organizations. */
function SettingsPage({ user }: { user: z.output<typeof schemas.zCurrentUser> }) {
    const [name, setName] = useState(user.name);
    const userUpdate = useUpdateUser();
    const location = useLocation();

    // Unknown fragments select Account without loading organization memberships.
    const section = location.hash === '#organizations' ? 'organizations' : 'account';

    /** Saves the validated account name and refreshes the profile. */
    async function saveAccount() {
        if (userUpdate.isPending || !name.trim() || name.trim() === user.name) return;

        // Cache the authoritative profile returned by a successful save.
        try {
            const updatedUser = await userUpdate.mutateAsync({ name: name.trim() });
            setName(updatedUser.name);
        } catch {
            setName(user.name);
        }
    }

    // Keep account editing independent of organization loading and failures.
    return (
        <Stack gap={8}>
            <Stack direction="horizontal" gap={3} align="center">
                <Avatar name={name} src={user.avatar} seed={user.id} />
                <Stack gap={0}>
                    <Heading level={4} accessibilityLevel={1}>
                        {name}
                    </Heading>
                    <Text type="supporting">{user.email}</Text>
                </Stack>
            </Stack>
            <Layout
                height="auto"
                start={
                    <LayoutPanel
                        isScrollable={false}
                        label="Settings navigation"
                        padding={0}
                        role="navigation"
                        width={260}
                    >
                        <SideNav className="h-auto w-full pr-4 [&>div:first-child]:pt-0 [&_.astryx-side-nav-section>div:first-child]:pt-0 [&_.astryx-side-nav-section>div:first-child]:pl-0">
                            <SideNavSection title="Settings" isHeaderHidden className="pt-0">
                                <SideNavItem
                                    href={`${location.pathname}${location.search}#account`}
                                    icon={<UserRound className="size-4" aria-hidden="true" />}
                                    isSelected={section === 'account'}
                                    label="Account"
                                />
                                <SideNavItem
                                    href={`${location.pathname}${location.search}#organizations`}
                                    icon={<Building2 className="size-4" aria-hidden="true" />}
                                    isSelected={section === 'organizations'}
                                    label="Organizations"
                                />
                            </SideNavSection>
                        </SideNav>
                    </LayoutPanel>
                }
            >
                <Stack gap={3}>
                    {section === 'organizations' ? (
                        <ApiBoundary>
                            <OrganizationManagement presentation="settings" />
                        </ApiBoundary>
                    ) : (
                        <Stack gap={8}>
                            <Stack gap={4}>
                                <Stack justify="end" minHeight="var(--size-element-md)">
                                    <Heading level={2} hasCapsize>
                                        Account
                                    </Heading>
                                </Stack>
                                <Divider />
                                <TextInput
                                    label="Username"
                                    value={name}
                                    isRequired
                                    isReadOnly={userUpdate.isPending}
                                    onChange={setName}
                                    onBlur={() => void saveAccount()}
                                />
                            </Stack>
                            <AppearanceSettings />
                        </Stack>
                    )}
                </Stack>
            </Layout>
        </Stack>
    );
}
