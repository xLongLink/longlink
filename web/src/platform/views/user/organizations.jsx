import { api } from '@/lib/api';
import { useState } from 'react';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Stack } from '@astryxdesign/core/Stack';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Spinner } from '@astryxdesign/core/Spinner';
import { useQueryClient } from '@tanstack/react-query';
import { useApi, useAction } from '@/lib/hooks/use-api';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Table, proportional } from '@astryxdesign/core/Table';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';

/** Lists the current user's organizations and creates new organizations. */
export default function Organizations() {
    const [name, setName] = useState('');
    const [creating, setCreating] = useState(false);
    const client = useQueryClient();
    const action = useAction();
    const memberships = useApi('/api/v1/me/organizations', schemas.zGetMyOrganizationsApiV1MeOrganizationsGetResponse);

    // Keep loading and failures distinct from an empty result.
    if (memberships.error) return <Banner status="error" title="Unable to load organizations" />;
    if (!memberships.data) return <Spinner label="Loading organizations" />;

    return (
        <Stack gap={8}>
            <Stack direction="horizontal" justify="between" align="center" wrap="wrap">
                <Heading level={1}>Organizations</Heading>
                <Button label="Create Organization" onClick={() => setCreating(true)} />
            </Stack>
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
                                <Stack align="start" gap={0}>
                                    <Link href={`/orgs/${row.organization.slug}`}>{row.organization.name}</Link>
                                    <Text type="supporting">Organization</Text>
                                </Stack>
                            </Stack>
                        ),
                    },
                ]}
            />
            <Dialog
                isOpen={creating}
                purpose="form"
                onOpenChange={(open) => {
                    if (!action.isPending) setCreating(open);
                }}
            >
                <DialogHeader
                    title="New organization"
                    onOpenChange={() => {
                        if (!action.isPending) setCreating(false);
                    }}
                />
                <Stack
                    gap={3}
                    as="form"
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (action.isPending || !name.trim()) return;

                        // Preserve the draft if creation fails and refresh memberships after success.
                        action.mutate(async () => {
                            await api.post('/api/v1/organizations', {
                                json: schemas.zOrganizationCreate.parse({ name: name.trim() }),
                            });
                            await client.invalidateQueries({
                                queryKey: ['api', '/api/v1/me/organizations'],
                                exact: true,
                            });
                            setCreating(false);
                        });
                    }}
                >
                    <TextInput label="Name" value={name} placeholder="Example LongLink" isRequired onChange={setName} />
                    <Button
                        label="Create organization"
                        variant="primary"
                        type="submit"
                        isDisabled={!name.trim()}
                        isLoading={action.isPending}
                    />
                </Stack>
            </Dialog>
        </Stack>
    );
}
