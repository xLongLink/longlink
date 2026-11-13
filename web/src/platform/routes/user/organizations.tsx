import { ApiBoundary } from '@/components/api';
import { PageContainer } from '@/components/page-container';
import OrganizationManagement from './organization-management';

/** Lists the current user's organizations and creates new organizations. */
export default function Organizations() {
    // Keep the page inside the existing Platform shell and request boundary.
    return (
        <PageContainer padding={2}>
            <title>Organizations | LongLink</title>
            <ApiBoundary>
                <OrganizationManagement presentation="overview" />
            </ApiBoundary>
        </PageContainer>
    );
}
