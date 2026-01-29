import { Navigation } from '@/components/navigation';
import { Route, Routes, useParams } from 'react-router';
import { Overview } from '@/components/overview';
import { Tools } from '@/components/tools';
import { Workflows } from '@/components/workflows';
import { Solutions } from '@/components/solutions';
import {
    GitBranch,
    LayoutGrid,
    Layers,
    Users,
    Wrench,
} from 'lucide-react';

const orgTabs = [
    {
        value: 'overview',
        label: 'Overview',
        path: '',
        icon: LayoutGrid,
    },
    {
        value: 'tools',
        label: 'Tools',
        path: 'tools',
        icon: Wrench,
    },
    {
        value: 'solutions',
        label: 'Solutions',
        path: 'solutions',
        icon: Layers,
    },
    {
        value: 'workflows',
        label: 'Workflows',
        path: 'workflows',
        icon: GitBranch,
    },
    {
        value: 'people',
        label: 'People',
        path: 'people',
        icon: Users,
    },
];


export function Module() {
    const { tool } = useParams();
    const basePathSuffix = tool ? `tools/${tool}` : 'tools';

    return (
        <Routes>
            <Route element={<Navigation tabs={orgTabs} basePathSuffix={basePathSuffix} />}>
                <Route index element={<Overview />} />
                <Route path="files" element={<Tools />} />
                <Route path="tickets" element={<Solutions />} />
                <Route path="settings" element={<Workflows />} />
            </Route>
        </Routes>
    );
}
