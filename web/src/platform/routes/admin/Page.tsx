import { useMatches } from 'react-router';
import { NoIndex } from '@/components/Seo';
import type { ComponentType } from 'react';
import Users from '@/platform/views/admin/users.jsx';
import Compute from '@/platform/views/admin/compute.jsx';
import Solutions from '@/platform/views/admin/solutions.jsx';
import Operations from '@/platform/views/admin/operations.jsx';
import { adminPages, type AdminPageId } from '@/platform/navigation';
import Organizations from '@/platform/views/admin/organizations.jsx';

const pageComponents: Record<AdminPageId, ComponentType> = {
    'admin-users': Users,
    'admin-solutions': Solutions,
    'admin-organizations': Organizations,
    'admin-compute': Compute,
    'admin-operations': Operations,
};

/** Renders one native JSX administrator page. */
export default function AdminPage() {
    const route = useMatches().at(-1);

    // Resolve the active route against the single administrator page inventory.
    const page = adminPages.find(({ id }) => id === route?.id);
    if (page === undefined) throw new Error('No administrator page matches the current route.');
    const Page = pageComponents[page.id];

    return (
        <>
            <NoIndex title={`${page.label} | LongLink`} />
            <Page key={page.id} />
        </>
    );
}
