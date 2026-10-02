import { api } from '@/lib/api';
import { useState } from 'react';
import { NoIndex } from '@/components/Seo';
import { Menu } from '@/components/ui/Menu';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@astryxdesign/core/Badge';
import { Stack } from '@astryxdesign/core/Stack';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { Spinner } from '@astryxdesign/core/Spinner';
import { useQueryClient } from '@tanstack/react-query';
import { useApi, useAction } from '@/lib/hooks/use-api';
import { TextInput } from '@astryxdesign/core/TextInput';
import { PageContainer } from '@/components/PageContainer';
import { useAuthenticatedUser } from '@/lib/hooks/use-user';
import { Table, proportional } from '@astryxdesign/core/Table';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import CreateOrganization from '@/platform/views/user/CreateOrganization';

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

/** Edits the authenticated profile and manages owned organizations.
 * @param {{ user: import('zod').output<typeof schemas.zUserSummary> }} props
 */
function SettingsPage({ user }) {
    const [name, setName] = useState(user.name);
    const [creating, setCreating] = useState(false);
    const [deletion, setDeletion] = useState(
        /** @type {import('zod').output<typeof schemas.zUserOrganizationMembership> | null} */ (null)
    );
    const client = useQueryClient();
    const action = useAction();
    const memberships = useApi('/api/v1/me/organizations', schemas.zGetMyOrganizationsApiV1MeOrganizationsGetResponse);

    // Keep loading and failures distinct from an empty result.
    const content = memberships.error ? (
        <Banner status="error" title="Unable to load account settings" />
    ) : !memberships.data ? (
        <Spinner label="Loading account settings" />
    ) : (
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
            <Menu
                sections={[
                    {
                        title: 'Settings',
                        isHeaderHidden: true,
                        entries: [
                            {
                                kind: 'item',
                                id: 'account',
                                label: 'Account',
                                icon: 'userRound',
                                content: (
                                    <Stack
                                        gap={4}
                                        as="form"
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            if (action.isPending || !name.trim()) return;

                                            // Refresh the authoritative profile after saving the validated draft.
                                            action.mutate(async () => {
                                                await api.patch('/api/v1/me', {
                                                    json: schemas.zUserUpdate.parse({ name: name.trim() }),
                                                });
                                                await client.invalidateQueries({
                                                    queryKey: ['api', '/api/v1/me'],
                                                    exact: true,
                                                });
                                            });
                                        }}
                                    >
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
                                                isLoading={action.isPending}
                                            />
                                        </Stack>
                                    </Stack>
                                ),
                            },
                            {
                                kind: 'item',
                                id: 'organizations',
                                label: 'Organizations',
                                icon: 'building2',
                                content: (
                                    <Stack gap={4}>
                                        <Stack direction="horizontal" justify="between" align="center" wrap="wrap">
                                            <Heading level={2}>Organizations</Heading>
                                            <Button label="Create Organization" onClick={() => setCreating(true)} />
                                        </Stack>
                                        <Divider />
                                        <Table
                                            data={memberships.data}
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
                                                                    <Link href={`/orgs/${row.organization.slug}`}>
                                                                        {row.organization.name}
                                                                    </Link>
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
                                                                onClick={() => setDeletion(row)}
                                                            />
                                                        ),
                                                },
                                            ]}
                                        />
                                    </Stack>
                                ),
                            },
                        ],
                    },
                ]}
            />
            {deletion && (
                <Dialog
                    isOpen
                    purpose="form"
                    onOpenChange={(open) => {
                        if (!open && !action.isPending) setDeletion(null);
                    }}
                >
                    <DialogHeader
                        title="Delete organization"
                        onOpenChange={() => {
                            if (!action.isPending) setDeletion(null);
                        }}
                    />
                    <Stack gap={3}>
                        <Text color="secondary">Delete {deletion.organization.name} from your account?</Text>
                        <Stack direction="horizontal" gap={2} justify="end">
                            <Button
                                label="Cancel"
                                variant="ghost"
                                isDisabled={action.isPending}
                                onClick={() => setDeletion(null)}
                            />
                            <Button
                                label="Delete"
                                variant="destructive"
                                isLoading={action.isPending}
                                onClick={() =>
                                    action.mutate(async () => {
                                        // Leave the confirmation open on failure and refresh memberships on success.
                                        await api.delete(`/api/v1/organizations/${deletion.organization.id}`);
                                        await client.invalidateQueries({
                                            queryKey: ['api', '/api/v1/me/organizations'],
                                            exact: true,
                                        });
                                        setDeletion(null);
                                    })
                                }
                            />
                        </Stack>
                    </Stack>
                </Dialog>
            )}
        </Stack>
    );

    // Keep the dialog's draft mounted through list refresh failures, but hide unavailable content.
    return (
        <>
            {content}
            <CreateOrganization
                isOpen={creating && !!memberships.data && !memberships.error}
                onOpenChange={setCreating}
                action={action}
            />
        </>
    );
}
