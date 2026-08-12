import { Banner } from '@astryxdesign/core/Banner';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { HStack } from '@astryxdesign/core/HStack';
import { Link } from '@astryxdesign/core/Link';
import { Table, type TableColumn, proportional } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { Wrench } from 'lucide-react';
import type { OrganizationApplicationSummary } from '@/lib/generated/platform-api-v1/types.gen';

/** Renders the organization applications table. */
export default function Applications({
    organization,
    applications,
    isLoading,
    error,
}: {
    organization: string;
    applications: OrganizationApplicationSummary[];
    isLoading: boolean;
    error: Error | null;
}) {
    const columns: TableColumn<OrganizationApplicationSummary>[] = [
        {
            key: 'name',
            header: 'Application',
            width: proportional(1),
            renderCell: (application) => (
                <HStack gap={3} align="center">
                    <Wrench aria-hidden="true" className="shrink-0 text-accent" size={20} />
                    <VStack gap={1}>
                        <Link href={`/orgs/${organization}/apps/${application.slug}`} weight="semibold">
                            {application.name}
                        </Link>
                        {application.description ? <Text type="supporting">{application.description}</Text> : null}
                    </VStack>
                </HStack>
            ),
        },
    ];

    if (isLoading && applications.length === 0) {
        return null;
    }

    // Surface application lookup failures when no stale data is available.
    if (error && applications.length === 0) {
        return <Banner status="error" title="Failed to load applications." />;
    }

    return (
        <Table
            columns={columns}
            data={applications}
            density="compact"
            emptyState={<EmptyState title="No results." isCompact />}
            hasHover
            idKey="id"
        />
    );
}
