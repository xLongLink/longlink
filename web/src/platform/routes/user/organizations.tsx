import { ApiBoundary } from '@/components/api';
import OrganizationManagement from './organization-management';

/** Lists the current user's organizations and creates new organizations. */
export default function Organizations() {
    return (
        <>
            <title>Organizations | LongLink</title>
            <ApiBoundary>
                <OrganizationManagement presentation="overview" />
            </ApiBoundary>
        </>
    );
}
