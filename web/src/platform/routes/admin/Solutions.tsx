import { api } from '@/lib/api';
import { useState } from 'react';
import { Ellipsis } from 'lucide-react';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { dateTimeFormatter } from '@/lib/utils';
import { useToast } from '@/lib/hooks/use-toast';
import { Stack } from '@astryxdesign/core/Stack';
import { usePaginate } from '@/lib/hooks/pagination';
import { Heading } from '@astryxdesign/core/Heading';
import { StatusBadge } from '@/components/ui/StatusBadge';
import MetadataDialog from '@/components/dialogs/Metadata';
import { Table, TableColumn } from '@/components/ui/Table';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { IconButton } from '@astryxdesign/core/IconButton';
import { PageError, PageLoading } from '@/components/Utils';
import { pixel, proportional } from '@astryxdesign/core/Table';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zPageSolutionResponse } from '@/lib/generated/platform-api-v1/zod.gen';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import type { SolutionResponse } from '@/lib/generated/platform-api-v1/types.gen';
import { DeleteConfirmation, useDeleteDialog } from '@/components/dialogs/DeleteConfirmation';

/** Renders the admin solutions page. */
export default function AdminSolutions() {
    const [metadataSolution, setMetadataSolution] = useState<SolutionResponse | null>(null);
    const toast = useToast();
    const queryClient = useQueryClient();
    const deleteSolution = useMutation({
        mutationFn: (solutionId: string) => api(`/api/v1/solutions/${solutionId}`, { method: 'DELETE' }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/solutions'] });
            toast({ body: 'Solution deleted' });
        },
    });
    const {
        items: solutions,
        error,
        isLoading,
        pagination,
    } = usePaginate('/api/v1/solutions', zPageSolutionResponse, 5000);
    const deleteDialog = useDeleteDialog({
        title: 'Delete solution',
        mutation: deleteSolution,
        items: solutions,
        getId: (solution) => solution.id,
        description: (solution) => `Delete solution ${solution.name}?`,
        errorMessage: 'Failed to delete solution',
        fallbackDescription: 'Delete this solution?',
        onError: (message) => toast({ body: message, type: 'error' }),
    });

    if (isLoading) {
        return <PageLoading label="Loading solutions" />;
    }

    if (error && solutions.length === 0) {
        return <PageError description="We couldn't load the platform solutions." title="Unable to load solutions" />;
    }

    return (
        <Stack gap={8}>
            <Stack>
                <Heading level={1}>Solutions</Heading>
                <Text as="p" color="secondary">
                    Review all solutions across organizations and deployment states.
                </Text>
            </Stack>
            <Table
                data={solutions}
                density="compact"
                emptyState={<EmptyState title="No results." isCompact />}
                hasHover
                idKey="id"
                plugins={{ pagination }}
            >
                <TableColumn<SolutionResponse> field="name" header="Solution" width={proportional(2)}>
                    {(solution) => (
                        <Stack>
                            <Stack direction="horizontal" gap={1} align="center">
                                <Link
                                    href={`/orgs/${solution.organization.slug}/solutions/${solution.slug}`}
                                    weight="semibold"
                                >
                                    {solution.name}
                                </Link>
                                <StatusBadge status={solution.status} />
                            </Stack>
                            {solution.description ? <Text type="supporting">{solution.description}</Text> : null}
                        </Stack>
                    )}
                </TableColumn>
                <TableColumn<SolutionResponse> field="organization" header="Organization" width={proportional(1)}>
                    {(solution) => (
                        <Stack direction="horizontal" gap={3} align="center">
                            <Avatar
                                kind="organization"
                                src={solution.organization.avatar}
                                name={solution.organization.name}
                            />
                            <Link href={`/orgs/${solution.organization.slug}`} weight="semibold">
                                {solution.organization.name}
                            </Link>
                        </Stack>
                    )}
                </TableColumn>
                <TableColumn<SolutionResponse> align="end" field="metadata" header="" width={pixel(56)}>
                    {(solution) => (
                        <IconButton
                            icon={<Ellipsis />}
                            label={`View metadata for ${solution.name}`}
                            tooltip="View metadata"
                            variant="ghost"
                            size="sm"
                            onClick={() => setMetadataSolution(solution)}
                        />
                    )}
                </TableColumn>
            </Table>
            {metadataSolution && (
                <MetadataDialog
                    onClose={() => setMetadataSolution(null)}
                    onDelete={() => deleteDialog.openFor(metadataSolution)}
                    title="Solution metadata"
                >
                    <MetadataList>
                        <MetadataListItem label="Status">
                            <StatusBadge status={metadataSolution.status} />
                        </MetadataListItem>
                        <MetadataListItem label="Organization">{metadataSolution.organization.name}</MetadataListItem>
                        <MetadataListItem label="Image">{metadataSolution.image_desired}</MetadataListItem>
                        <MetadataListItem label="ID">{metadataSolution.id}</MetadataListItem>
                        <MetadataListItem label="Slug">{metadataSolution.slug}</MetadataListItem>
                        {metadataSolution.description ? (
                            <MetadataListItem label="Description">{metadataSolution.description}</MetadataListItem>
                        ) : null}
                        <MetadataListItem label="Created">
                            {dateTimeFormatter.format(new Date(metadataSolution.created_at))}
                        </MetadataListItem>
                    </MetadataList>
                </MetadataDialog>
            )}
            <DeleteConfirmation {...deleteDialog.dialogProps} />
        </Stack>
    );
}
