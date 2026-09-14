import { NoIndex } from '@/components/Seo';
import { useLocation } from 'react-router';
import { PlatformView } from '@/components/PlatformView';
import users from '@/platform/views/admin/users.xml?raw';
import compute from '@/platform/views/admin/compute.xml?raw';
import solutions from '@/platform/views/admin/solutions.xml?raw';
import operations from '@/platform/views/admin/operations.xml?raw';
import organizations from '@/platform/views/admin/organizations.xml?raw';

const pages: Record<string, { key: string; source: string; title: string }> = {
    '/admin/users': { key: 'users', source: users, title: 'Users | LongLink' },
    '/admin/solutions': { key: 'solutions', source: solutions, title: 'Solutions | LongLink' },
    '/admin/organizations': { key: 'organizations', source: organizations, title: 'Organizations | LongLink' },
    '/admin/compute': { key: 'compute', source: compute, title: 'Compute | LongLink' },
    '/admin/operations': { key: 'operations', source: operations, title: 'Operations | LongLink' },
};

/** Renders one static XML-backed administrator route. */
export default function AdminPage() {
    const page = pages[useLocation().pathname];

    return (
        <>
            <NoIndex title={page.title} />
            <PlatformView key={page.key} source={page.source} />
        </>
    );
}
