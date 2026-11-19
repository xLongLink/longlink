import { ApiBoundary } from '@/components/api';
import OrganizationManagement from './organization-management';
import { PageContainer } from '@/components/ui/page-container';

/** Lists the current user's organizations and creates new organizations. */
export default function Organizations() {
    // Keep the page inside the existing Platform shell and request boundary.
    return (
        <PageContainer>
            <title>Organizations | LongLink</title>
            <ApiBoundary>
                <OrganizationManagement presentation="overview" />
            </ApiBoundary>
        </PageContainer>
    );
}
