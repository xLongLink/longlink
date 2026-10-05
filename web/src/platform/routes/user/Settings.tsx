import type { z } from 'zod';
import { api } from '@/lib/api';
import { NoIndex } from '@/components/Seo';
import { useApi } from '@/lib/hooks/use-api';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { useState, useTransition } from 'react';
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
import { AlertDialog } from '@astryxdesign/core/AlertDialog';
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
            <Stack direction="horizontal" gap={3} align="start">
                <Avatar name={name} src={user.avatar} />
                <Stack gap={1}>
                    <Heading level={4} accessibilityLevel={1}>
                        {name}
                    </Heading>
                    <Text type="supporting">Your Account</Text>
                </Stack>
            </Stack>
            <Menu>
                <MenuSection title="Settings" isHeaderHidden>
                    <MenuItem id="account" label="Account" icon="userRound">
                        <form action={saveAccount}>
                            <Stack gap={4}>
                                <Heading level={2}>Account</Heading>
                                <Divider />
                                <TextInput label="Username" value={name} isRequired onChange={setName} />
                                <Text>
                                    <b>Email</b> {user.email}
                                </Text>
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
                    <MenuItem id="organizations" label="Organizations" icon="building2">
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
    const [isDeleting, startDeletion] = useTransition();
    const [deletion, setDeletion] = useState<{ id: string; name: string } | null>(null);
    const [memberships, invalidate] =
        useApi<z.output<typeof schemas.zGetMyOrganizationsApiV1MeOrganizationsGetResponse>>('/api/v1/me/organizations');

    return (
        <>
            <Stack gap={4}>
                <Stack direction="horizontal" justify="between" align="center" wrap="wrap">
                    <Heading level={2}>Organizations</Heading>
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
                                    <Avatar shape="rounded" name={row.organization.name} />
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
                        {
                            key: 'role',
                            header: 'Actions',
                            align: 'end',
                            width: proportional(0.5),
                            renderCell: (row) =>
                                row.role === 'owner' && (
                                    <Button
                                        label="Delete"
                                        variant="destructive"
                                        onClick={() =>
                                            setDeletion({ id: row.organization.id, name: row.organization.name })
                                        }
                                    />
                                ),
                        },
                    ]}
                />
                {deletion && (
                    <AlertDialog
                        isOpen
                        title="Delete organization"
                        description={`Delete ${deletion.name} from your account?`}
                        actionLabel="Delete"
                        isActionLoading={isDeleting}
                        onOpenChange={(open) => {
                            if (!open) setDeletion(null);
                        }}
                        onAction={() =>
                            startDeletion(async () => {
                                // Refresh memberships only after deletion succeeds.
                                await api.delete(`/api/v1/organizations/${deletion.id}`);
                                await invalidate();
                                setDeletion(null);
                            })
                        }
                    />
                )}
            </Stack>
            <CreateOrganization isOpen={creating} onOpenChange={setCreating} invalidate={invalidate} />
        </>
    );
}
