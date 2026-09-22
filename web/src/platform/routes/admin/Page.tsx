import { useMatches } from 'react-router';
import { NoIndex } from '@/components/Seo';
import { PlatformView } from '@/components/PlatformView';
import users from '@/platform/views/admin/users.xml?raw';
import compute from '@/platform/views/admin/compute.xml?raw';
import solutions from '@/platform/views/admin/solutions.xml?raw';
import operations from '@/platform/views/admin/operations.xml?raw';
import { adminPages, type AdminPageId } from '@/platform/navigation';
import organizations from '@/platform/views/admin/organizations.xml?raw';

const pageSources: Record<AdminPageId, string> = {
    'admin-users': users,
    'admin-solutions': solutions,
    'admin-organizations': organizations,
    'admin-compute': compute,
    'admin-operations': operations,
};

/** Renders one static XML-backed administrator route. */
export default function AdminPage() {
    const route = useMatches().at(-1);

    // Resolve the active route against the single administrator page inventory.
    const page = adminPages.find(({ id }) => id === route?.id);
    if (page === undefined) throw new Error('No administrator page matches the current route.');

    return (
        <>
            <NoIndex title={`${page.label} | LongLink`} />
            <PlatformView source={pageSources[page.id]} />
        </>
    );
}
