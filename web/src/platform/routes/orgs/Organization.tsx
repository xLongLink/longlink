import { useParams } from 'react-router';
import { NoIndex } from '@/components/Seo';
import OrganizationPage from '@/platform/views/orgs/organization.jsx';

/** Renders the native organization Solutions page. */
export default function Organization() {
    const { organization = '' } = useParams();

    return (
        <>
            <NoIndex title="Organization Solutions | LongLink" />
            <OrganizationPage key={organization} organization={organization} />
        </>
    );
}
