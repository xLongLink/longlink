import type { z } from 'zod';
import { api } from '@/lib/api';
import { NoIndex } from '@/components/NoIndex';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Stack } from '@astryxdesign/core/Stack';
import { useState, type MouseEvent } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { UserRound, Building2 } from 'lucide-react';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { ApiBoundary } from '@/components/ApiBoundary';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { TextInput } from '@astryxdesign/core/TextInput';
import { PageContainer } from '@/components/PageContainer';
import { useAuthenticatedUser } from '@/lib/hooks/use-user';
import OrganizationManagement from './OrganizationManagement';
import { Layout, LayoutPanel } from '@astryxdesign/core/Layout';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';

/** Renders account metadata and resets drafts when the authenticated identity changes. */
export default function Settings() {
    const user = useAuthenticatedUser();

    return (
        <PageContainer padding={2}>
            <NoIndex title="Account Settings | LongLink" />
            <SettingsPage key={user.id} user={user} />
        </PageContainer>
    );
}

/** Edits the authenticated profile and manages owned organizations. */
function SettingsPage({ user }: { user: z.output<typeof schemas.zUserSummary> }) {
    const [name, setName] = useState(user.name);
    const queryClient = useQueryClient();
    const location = useLocation();
    const navigate = useNavigate();
    const isNarrow = useMediaQuery('(width < 48rem)');

    // Unknown fragments select Account without loading organization memberships.
    const section = location.hash === '#organizations' ? 'organizations' : 'account';

    /** Preserves ordinary-click history pushes while leaving modified clicks to the native link. */
    function selectSection(event: MouseEvent, id: string) {
        // Leave prevented and modified activations to the native link.
        if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey
        )
            return;

        // Push even when the selected fragment is already current, matching the existing Menu behavior.
        event.preventDefault();
        void navigate({ pathname: location.pathname, search: location.search, hash: `#${id}` });
    }

    /** Saves the validated account name and refreshes the profile. */
    async function saveAccount() {
        if (!name.trim()) return;

        // Refresh the authoritative profile only after saving succeeds.
        await api.patch('/api/v1/me', { json: schemas.zUserUpdate.parse({ name: name.trim() }) });
        await queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/me'], exact: true });
    }

    // Move the settings navigation above full-width content below the md breakpoint.
    const settingsNavigation = (
        <LayoutPanel
            isScrollable={false}
            label="Settings navigation"
            padding={0}
            role="navigation"
            width={isNarrow ? '100%' : 260}
        >
            <SideNav className="h-auto w-full md:pr-4 [&>div:first-child]:pt-0 [&_.astryx-side-nav-section>div:first-child]:pt-0 [&_.astryx-side-nav-section>div:first-child]:pl-0">
                <SideNavSection title="Settings" isHeaderHidden className="pt-0">
                    <SideNavItem
                        as="a"
                        href={`${location.pathname}${location.search}#account`}
                        icon={<UserRound className="size-4" aria-hidden="true" />}
                        isSelected={section === 'account'}
                        label="Account"
                        onClick={(event) => selectSection(event, 'account')}
                    />
                    <SideNavItem
                        as="a"
                        href={`${location.pathname}${location.search}#organizations`}
                        icon={<Building2 className="size-4" aria-hidden="true" />}
                        isSelected={section === 'organizations'}
                        label="Organizations"
                        onClick={(event) => selectSection(event, 'organizations')}
                    />
                </SideNavSection>
            </SideNav>
        </LayoutPanel>
    );

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
                header={isNarrow ? <Stack paddingBlockEnd={4}>{settingsNavigation}</Stack> : undefined}
                start={isNarrow ? undefined : settingsNavigation}
            >
                <Stack gap={3}>
                    {section === 'organizations' ? (
                        <ApiBoundary>
                            <OrganizationManagement presentation="settings" />
                        </ApiBoundary>
                    ) : (
                        <form action={saveAccount}>
                            <Stack gap={4}>
                                <Stack justify="end" minHeight="var(--size-element-md)">
                                    <Heading level={2} hasCapsize>
                                        Account
                                    </Heading>
                                </Stack>
                                <Divider />
                                <TextInput label="Username" value={name} isRequired onChange={setName} />
                                <Stack direction="horizontal" justify="end">
                                    <Button
                                        label="Save account"
                                        variant="primary"
                                        type="submit"
                                        isDisabled={!name.trim()}
                                    />
                                </Stack>
                            </Stack>
                        </form>
                    )}
                </Stack>
            </Layout>
        </Stack>
    );
}
