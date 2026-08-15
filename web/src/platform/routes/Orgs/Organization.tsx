import { useParams } from 'react-router';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Banner } from '@astryxdesign/core/Banner';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Heading } from '@astryxdesign/core/Heading';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { AppWindow, Settings2, Wrench } from 'lucide-react';
import { Table, type TableColumn, proportional } from '@astryxdesign/core/Table';
import type { OrganizationApplicationSummary } from '@/lib/generated/platform-api-v1/types.gen';
import NotFound from '@/platform/NotFound';
import PlatformLayout from '@/platform/layout';
import { PageContainer } from '@/components/PageContainer';
import { useOrganization } from '@/hooks/use-organization';

/** Renders the organization applications page. */
export default function Organization() {
    const { organization = '' } = useParams();
    const { applications, isLoading, error } = useOrganization(organization);
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

    // Hide missing or inaccessible orgs behind the shared 404 page.
    if (error?.status === 404) {
        return <NotFound />;
    }

    // Keep edge-aware content aligned within the centered page container.
    return (
        <PlatformLayout
            tabs={[
                { href: `/orgs/${organization}`, icon: AppWindow, label: 'Applications' },
                { href: `/orgs/${organization}/settings`, icon: Settings2, label: 'Settings' },
            ]}
        >
            <PageContainer gap={8}>
                <Stack gap={1} width="100%">
                    <Heading level={1}>Applications</Heading>
                    <Text as="p" color="secondary">
                        Manage the applications attached to this organization.
                    </Text>
                </Stack>
                {isLoading && applications.length === 0 ? null : error && applications.length === 0 ? (
                    <Banner status="error" title="Failed to load applications." />
                ) : (
                    <Table
                        columns={columns}
                        data={applications}
                        density="compact"
                        emptyState={<EmptyState title="No results." isCompact />}
                        hasHover
                        idKey="id"
                    />
                )}
            </PageContainer>
        </PlatformLayout>
    );
}
