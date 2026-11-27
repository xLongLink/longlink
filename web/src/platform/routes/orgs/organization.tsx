import { useOutletContext } from 'react-router';
import { SolutionOverview } from './solution-overview';
import type { OrganizationContext } from '@/platform/layouts/organization';

/** Lists an organization's Solutions; the layout owns organization-scoped state resets. */
export default function Organization() {
    const membership = useOutletContext<OrganizationContext>();

    return (
        <>
            <title>Organization Solutions | LongLink</title>
            <SolutionOverview membership={membership} />
        </>
    );
}
