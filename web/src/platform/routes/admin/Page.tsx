import { useMatches } from 'react-router';
import { NoIndex } from '@/components/Seo';
import { PlatformView } from '@/components/PlatformView';
import users from '@/platform/views/admin/users.xml?raw';
import compute from '@/platform/views/admin/compute.xml?raw';
import solutions from '@/platform/views/admin/solutions.xml?raw';
import operations from '@/platform/views/admin/operations.xml?raw';
import organizations from '@/platform/views/admin/organizations.xml?raw';

const pages: Record<string, { source: string; title: string }> = {
    'admin-users': { source: users, title: 'Users | LongLink' },
    'admin-solutions': { source: solutions, title: 'Solutions | LongLink' },
    'admin-organizations': { source: organizations, title: 'Organizations | LongLink' },
    'admin-compute': { source: compute, title: 'Compute | LongLink' },
    'admin-operations': { source: operations, title: 'Operations | LongLink' },
};

/** Renders one static XML-backed administrator route. */
export default function AdminPage() {
    const route = useMatches().at(-1);
    const page = pages[route?.id ?? ''];

    if (page === undefined) throw new Error('No administrator page matches the current route.');

    return (
        <>
            <NoIndex title={page.title} />
            <PlatformView source={page.source} />
        </>
    );
}
