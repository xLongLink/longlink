import { z } from 'zod';
import { api } from '@/lib/api';
import { useState } from 'react';
import { useApiError } from '@/lib/errors';
import { ApiBoundary } from '@/components/api';
import { apiQueryOptions } from '@/lib/react-query';
import { Ban, Eye, Pencil, Shield } from 'lucide-react';
import { Stack } from '@/components/longlink/layout/stack';
import { Empty } from '@/components/longlink/display/empty';
import { Button } from '@/components/longlink/action/button';
import { Dialog } from '@/components/longlink/layout/dialog';
import { Avatar } from '@/components/longlink/display/avatar';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { useMutation, useQueryClient, useSuspenseQueries } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/longlink/display/table';

export function SolutionPermissionsDialog({
    solutionId,
    organizationId,
    onOpenChange
}: {
    onOpenChange: (open: boolean) => void;
    solutionId: string;
    organizationId: string;
}) {
    return (
        <Dialog open onOpenChange={onOpenChange} title="Solution permissions">
            <ApiBoundary key={solutionId}>
                <SolutionPermissions
                    solutionId={solutionId}
                    organizationId={organizationId}
                    onClose={() => onOpenChange(false)}
                />
            </ApiBoundary>
        </Dialog>
    );
}

/** Assigns SDK-defined Solution roles without changing organization roles. */
export default function SolutionPermissions({
    solutionId,
    organizationId,
    onClose
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
            )
        ]
    });

    return (
        <Stack gap={4}>
            {settings.roles.length === 0 ? (
                <span>Rebuild and deploy the Solution to load its roles.</span>
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
    onClose
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
        queries: members.map(({ user }) => apiQueryOptions(`${base}/members/${user.id}/access`, schemas.zMemberAccess))
    });

    const rows = members.map(({ user }, index) => ({
        ...user,
        role: roles[user.id] ?? assignments[index].data.role ?? ''
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
                    json: schemas.zAccessUpdate.parse({ role: member.role || null, revision_id: settings.revision_id })
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
        onSuccess: onClose
    });

    return (
        <Stack gap={4}>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Role</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((member) => (
                        <TableRow key={member.id}>
                            <TableCell>
                                <Stack direction="horizontal" gap={3} align="center">
                                    <Avatar name={member.name} src={member.avatar} />
                                    <Stack gap={0}>
                                        <span>{member.name}</span>
                                        <span className="text-xs text-muted-foreground">{member.email}</span>
                                    </Stack>
                                </Stack>
                            </TableCell>
                            <TableCell>
                                <Select
                                    disabled={save.isPending}
                                    value={member.role}
                                    items={[
                                        { value: '', label: 'No access' },
                                        ...settings.roles.map((value) => ({ value, label: value }))
                                    ]}
                                    onValueChange={(role) =>
                                        setRoles((current) => ({ ...current, [member.id]: role ?? '' }))
                                    }
                                >
                                    <SelectTrigger aria-label={`Role for ${member.name}`} className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">
                                            <Ban aria-hidden="true" />
                                            No access
                                        </SelectItem>
                                        {settings.roles.map((role) => (
                                            <SelectItem key={role} value={role}>
                                                {role === 'read' ? (
                                                    <Eye aria-hidden="true" />
                                                ) : role === 'write' ? (
                                                    <Pencil aria-hidden="true" />
                                                ) : (
                                                    <Shield aria-hidden="true" />
                                                )}
                                                {role}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </TableCell>
                        </TableRow>
                    ))}
                    {rows.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={2} align="center">
                                <Empty role="status" title="No data" />
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
            <Stack direction="horizontal" gap={2} justify="end">
                <Button size="sm" variant="ghost" disabled={save.isPending} onClick={onClose}>
                    Cancel
                </Button>
                <Button
                    size="sm"
                    aria-busy={save.isPending || undefined}
                    disabled={save.isPending || Object.keys(roles).length === 0}
                    onClick={() => save.mutate()}
                >
                    Save
                </Button>
                <span role="status" className="sr-only">
                    {save.isPending ? 'Loading' : ''}
                </span>
            </Stack>
        </Stack>
    );
}
