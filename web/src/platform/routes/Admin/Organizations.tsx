import { Copy } from 'lucide-react';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Banner } from '@astryxdesign/core/Banner';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Heading } from '@astryxdesign/core/Heading';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, type TableColumn, pixel, proportional } from '@astryxdesign/core/Table';
import type { OrganizationSummary } from '@/lib/generated/platform-api-v1/types.gen';
import { fetchApiVoid } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useApiQuery } from '@/hooks/use-api';
import { useDeleteDialog } from '@/lib/utils';
import { platformApiPath } from '@/lib/platform-api';
import { organizationsQueryKey } from '@/lib/query-keys';
import { useAdminPagination } from '@/platform/admin/pagination';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { zOrganizationSummary } from '@/lib/generated/platform-api-v1/zod.gen';

/** Renders the admin organizations page. */
export default function AdminOrganizations() {
    const toast = useToast();
    const queryClient = useQueryClient();
    const deleteOrganization = useMutation({
        mutationFn: (organizationId: string) =>
            fetchApiVoid(platformApiPath(`/organizations/${organizationId}`), { method: 'DELETE' }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: organizationsQueryKey });
            toast({ body: 'Organization deleted' });
        },
    });
    const {
        data: organizations = [],
        error,
        isLoading,
    } = useApiQuery<OrganizationSummary[]>(platformApiPath('/organizations'), {
        parse: (value) => zOrganizationSummary.array().parse(value),
    });
    const { pageItems, pagination } = useAdminPagination(organizations);
    const deleteDialog = useDeleteDialog({
        title: 'Delete organization',
        mutation: deleteOrganization,
        items: organizations,
        getId: (organization) => organization.id,
        description: (organization) => `Delete organization ${organization.name}?`,
        errorMessage: 'Failed to delete organization',
        fallbackDescription: 'Delete this organization?',
        onError: (message) => toast({ body: message, type: 'error' }),
    });
    const columns: TableColumn<OrganizationSummary>[] = [
        {
            key: 'name',
            header: 'Name',
            width: proportional(1),
            renderCell: (organization) => (
                <HStack gap={3} align="center">
                    <Avatar src={organization.avatar ?? undefined} name={organization.name} size="md" />
                    <Link href={`/orgs/${organization.slug}`} weight="semibold">
                        {organization.name}
                    </Link>
                </HStack>
            ),
        },
        {
            key: 'actions',
            header: 'Action',
            width: pixel(96),
            align: 'end',
            renderCell: (organization) => (
                <MoreMenu
                    label={`Open actions for ${organization.name}`}
                    size="sm"
                    items={[
                        {
                            label: 'Copy organization name',
                            icon: <Copy size={16} />,
                            onClick: async () => {
                                try {
                                    await navigator.clipboard.writeText(organization.name);
                                    toast({ body: 'Organization name: Copied' });
                                } catch {
                                    toast({ body: 'Failed to copy to clipboard', type: 'error' });
                                }
                            },
                        },
                        { label: 'Delete', onClick: () => deleteDialog.openFor(organization) },
                    ]}
                />
            ),
        },
    ];

    return (
        <VStack gap={6} width="100%">
            <VStack gap={1}>
                <Heading level={1}>Organizations</Heading>
                <Text type="supporting">Review organization lifecycle, ownership, and access boundaries.</Text>
            </VStack>
            {isLoading && organizations.length === 0 ? null : error && organizations.length === 0 ? (
                <Banner status="error" title={error.message} />
            ) : (
                <Table
                    columns={columns}
                    data={pageItems}
                    density="compact"
                    emptyState={<EmptyState title="No results." isCompact />}
                    hasHover
                    idKey="id"
                    plugins={{ pagination }}
                />
            )}
            <DeleteConfirmation {...deleteDialog.dialogProps} />
        </VStack>
    );
}
