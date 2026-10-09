import type { z } from 'zod';
import { api } from '@/lib/api';
import { useState } from 'react';
import { useApi } from '@/lib/hooks/use-api';
import { NoIndex } from '@/components/NoIndex';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@astryxdesign/core/Badge';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import CreateOrganization from './CreateOrganization';
import { ApiBoundary } from '@/components/ApiBoundary';
import { useQueryClient } from '@tanstack/react-query';
import { TextInput } from '@astryxdesign/core/TextInput';
import { PageContainer } from '@/components/PageContainer';
import { useAuthenticatedUser } from '@/lib/hooks/use-user';
import { Table, proportional } from '@astryxdesign/core/Table';
import { Menu, MenuSection, MenuItem } from '@/components/ui/Menu';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';

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

    /** Saves the validated account name and refreshes the profile. */
    async function saveAccount() {
        if (!name.trim()) return;

        // Refresh the authoritative profile only after saving succeeds.
        await api.patch('/api/v1/me', { json: schemas.zUserUpdate.parse({ name: name.trim() }) });
        await queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/me'], exact: true });
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
            <Menu>
                <MenuSection title="Settings" isHeaderHidden>
                    <MenuItem label="Account" icon="userRound">
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
                    </MenuItem>
                    <MenuItem label="Organizations" icon="building2">
                        <ApiBoundary>
                            <OrganizationSettings />
                        </ApiBoundary>
                    </MenuItem>
                </MenuSection>
            </Menu>
        </Stack>
    );
}

/** Owns organization management independently of account editing. */
function OrganizationSettings() {
    const [creating, setCreating] = useState(false);

    const [memberships, invalidate] =
        useApi<z.output<typeof schemas.zUserOrganizationMembership>[]>('/api/v1/me/organizations');

    return (
        <>
            <Stack gap={4}>
                <Stack
                    direction="horizontal"
                    justify="between"
                    align="end"
                    wrap="wrap"
                    minHeight="var(--size-element-md)"
                >
                    <Heading level={2} hasCapsize>
                        Organizations
                    </Heading>
                    <Button label="Create Organization" onClick={() => setCreating(true)} />
                </Stack>
                <Divider />
                <Table
                    data={memberships}
                    idKey={(row) => row.organization.id}
                    hasHover
                    density="compact"
                    columns={[
                        {
                            key: 'organization',
                            header: 'Name',
                            width: proportional(1),
                            renderCell: (row) => (
                                <Stack direction="horizontal" gap={3} align="center">
                                    <Avatar kind="organization" name={row.organization.name} />
                                    <Stack align="start">
                                        <Stack direction="horizontal" gap={1} align="center">
                                            <Link href={`/orgs/${row.organization.slug}`}>{row.organization.name}</Link>
                                            <Badge label={row.role} />
                                        </Stack>
                                        <Text type="supporting">Organization</Text>
                                    </Stack>
                                </Stack>
                            ),
                        },
                    ]}
                />
            </Stack>
            <CreateOrganization isOpen={creating} onOpenChange={setCreating} invalidate={invalidate} />
        </>
    );
}
