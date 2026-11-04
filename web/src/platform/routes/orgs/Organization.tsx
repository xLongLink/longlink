import { useOutletContext } from 'react-router';
import SolutionManagement from './SolutionManagement';
import type { OrganizationContext } from '@/platform/layouts/Organization';

/** Lists an organization's Solutions; the layout owns organization-scoped state resets. */
export default function Organization() {
    const membership = useOutletContext<OrganizationContext>();

    return (
        <>
            <title>Organization Solutions | LongLink</title>
            <SolutionManagement membership={membership} presentation="overview" />
        </>
    );
}
