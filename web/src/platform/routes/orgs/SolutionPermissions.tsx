import { z } from 'zod';
import { api } from '@/lib/api';
import { useState } from 'react';
import { useApiError } from '@/lib/errors';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { apiQueryOptions } from '@/lib/react-query';
import { Heading } from '@astryxdesign/core/Heading';
import { ApiBoundary } from '@/components/ApiBoundary';
import { Selector } from '@astryxdesign/core/Selector';
import { Ban, Eye, Pencil, Shield } from 'lucide-react';
import { Table, proportional } from '@astryxdesign/core/Table';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { useMutation, useQueryClient, useSuspenseQueries } from '@tanstack/react-query';

/** Assigns SDK-defined Solution roles without changing organization roles. */
export default function SolutionPermissions({
    solutionId,
    organizationId,
    onClose,
}: {
    solutionId: string;
    organizationId: string;
    onClose: () => void;
}) {
    const base = `/api/v1/solutions/${solutionId}`;

    // Load independent settings and membership data together.
    const [{ data: settings }, { data: members }] = useSuspenseQueries({
        queries: [
            apiQueryOptions(`${base}/permissions`, schemas.zPermissionSettings),
            apiQueryOptions(
                `/api/v1/organizations/${organizationId}/members`,
                schemas.zOrganizationMemberAccessResponse.array()
            ),
        ],
    });

    return (
        <Stack gap={4} padding={6}>
            <Heading level={2}>Solution permissions</Heading>
            {!settings.catalog ? (
                <Text>Rebuild and deploy the Solution to load its roles.</Text>
            ) : (
                <ApiBoundary key={`${solutionId}:${settings.revision_id}`}>
                    <MemberPermissions base={base} members={members} settings={settings} onClose={onClose} />
                </ApiBoundary>
            )}
        </Stack>
    );
}

/** Loads member assignments and saves only edited roles, retaining unsaved changes after a failure. */
function MemberPermissions({
    base,
    members,
    settings,
    onClose,
}: {
    base: string;
    members: z.output<typeof schemas.zOrganizationMemberAccessResponse>[];
    settings: z.output<typeof schemas.zPermissionSettings>;
    onClose: () => void;
}) {
    const client = useQueryClient();
    const reportError = useApiError();
    const [roles, setRoles] = useState<Record<string, string>>({});

    // Load independent assignments together so every member appears in the table.
    const assignments = useSuspenseQueries({
        queries: members.map(({ user }) => apiQueryOptions(`${base}/members/${user.id}/access`, schemas.zMemberAccess)),
    });

    const rows = members.map(({ user }, index) => ({
        ...user,
        role: roles[user.id] ?? assignments[index].data.role ?? '',
    }));

    // Acknowledge each saved assignment before proceeding so failed saves can be retried safely.
    const save = useMutation({
        retry: false,
        networkMode: 'always',
        mutationFn: async () => {
            for (const member of rows) {
                if (!(member.id in roles)) continue;
                const path = `${base}/members/${member.id}/access`;
                await api.put(path, {
                    json: schemas.zAccessUpdate.parse({
                        role: member.role || null,
                        revision_id: settings.revision_id,
                    }),
                });
                client.setQueryData<z.output<typeof schemas.zMemberAccess>>(['api', path], (current) =>
                    current ? { ...current, role: member.role || null } : current
                );
                setRoles((current) => {
                    const updated = { ...current };
                    delete updated[member.id];

                    return updated;
                });
                await client.invalidateQueries({ queryKey: ['api', path], exact: true });
            }
        },
        onError: reportError,
        onSuccess: onClose,
    });

    return (
        <Stack gap={4}>
            <Table
                data={rows}
                idKey="id"
                density="compact"
                columns={[
                    {
                        key: 'member',
                        header: 'Member',
                        width: proportional(2),
                        renderCell: (member) => (
                            <Stack direction="horizontal" gap={3} align="center">
                                <Avatar name={member.name} src={member.avatar} seed={member.id} />
                                <Stack gap={0}>
                                    <Text>{member.name}</Text>
                                    <Text type="supporting">{member.email}</Text>
                                </Stack>
                            </Stack>
                        ),
                    },
                    {
                        key: 'role',
                        header: 'Role',
                        width: proportional(1),
                        renderCell: (member) => (
                            <Selector
                                label={`Role for ${member.name}`}
                                isLabelHidden
                                isDisabled={save.isPending}
                                value={member.role}
                                options={[
                                    { value: '', label: 'No access', icon: Ban },
                                    ...settings.roles.map((value) => ({
                                        value,
                                        label: value,
                                        icon: value === 'read' ? Eye : value === 'write' ? Pencil : Shield,
                                    })),
                                ]}
                                onChange={(role) => setRoles((current) => ({ ...current, [member.id]: role }))}
                            />
                        ),
                    },
                ]}
            />
            <Stack direction="horizontal" gap={2} justify="end">
                <Button label="Cancel" size="sm" variant="ghost" isDisabled={save.isPending} onClick={onClose} />
                <Button
                    label="Save"
                    size="sm"
                    variant="primary"
                    isLoading={save.isPending}
                    isDisabled={save.isPending || Object.keys(roles).length === 0}
                    onClick={() => save.mutate()}
                />
            </Stack>
        </Stack>
    );
}
