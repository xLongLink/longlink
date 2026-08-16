import { Wrench } from 'lucide-react';
import { useParams } from 'react-router';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Banner } from '@astryxdesign/core/Banner';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Heading } from '@astryxdesign/core/Heading';
import { proportional } from '@astryxdesign/core/Table';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import type { OrganizationApplicationSummary } from '@/lib/generated/platform-api-v1/types.gen';
import { Auth } from '@/components/Auth';
import NotFound from '@/platform/NotFound';
import { PageContainer } from '@/components/PageContainer';
import { Table, TableColumn } from '@/components/ui/Table';
import { useOrganization } from '@/lib/hooks/use-organization';

/** Renders the organization applications page. */
function OrganizationContent() {
    const { organization = '' } = useParams();
    const { applications, isLoading, error } = useOrganization(organization);
    // Hide missing or inaccessible orgs behind the shared 404 page.
    if (error?.status === 404) {
        return <NotFound />;
    }

    // Keep edge-aware content aligned within the centered page container.
    return (
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
                    data={applications}
                    density="compact"
                    emptyState={<EmptyState title="No results." isCompact />}
                    hasHover
                    idKey="id"
                >
                    <TableColumn<OrganizationApplicationSummary>
                        field="name"
                        header="Application"
                        width={proportional(1)}
                    >
                        {(application) => (
                            <HStack gap={3} align="center">
                                <Wrench aria-hidden="true" className="shrink-0 text-accent" size={20} />
                                <VStack gap={1}>
                                    <Link href={`/orgs/${organization}/apps/${application.slug}`} weight="semibold">
                                        {application.name}
                                    </Link>
                                    {application.description ? (
                                        <Text type="supporting">{application.description}</Text>
                                    ) : null}
                                </VStack>
                            </HStack>
                        )}
                    </TableColumn>
                </Table>
            )}
        </PageContainer>
    );
}

/** Protects the organization applications page. */
export default function Organization() {
    return (
        <Auth>
            <OrganizationContent />
        </Auth>
    );
}
