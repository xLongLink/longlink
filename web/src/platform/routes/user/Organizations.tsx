import { NoIndex } from '@/components/Seo';
import { PageContainer } from '@/components/PageContainer';
import OrganizationsPage from '@/platform/views/user/organizations.jsx';

/** Renders the organizations landing page for the authenticated user. */
export default function Organizations() {
    return (
        <PageContainer padding={2}>
            <NoIndex title="Organizations | LongLink" />
            <OrganizationsPage />
        </PageContainer>
    );
}
