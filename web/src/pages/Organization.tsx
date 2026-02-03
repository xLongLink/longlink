import { Overview } from '@/components/overview';
import { Tools } from '@/components/tools';
import { Workflows } from '@/components/workflows';
import { Solutions } from '@/components/solutions';
import { Route, Routes } from 'react-router';
import {
    FileText,
    GitBranch,
    LayoutGrid,
    Layers,
    Users,
    Wrench,
} from 'lucide-react';
import { Navigation } from '@/components/navigation';


export function Organization() {
    const orgTabs = [
        { value: 'overview', label: 'Overview', path: '', icon: LayoutGrid },
        { value: 'tools', label: 'Tools', path: 'tools', icon: Wrench },
        { value: 'text', label: 'Text', path: 'text', icon: FileText },
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
        { value: 'people', label: 'People', path: 'people', icon: Users },
    ];

    return (
        <Routes>
            <Route element={<Navigation tabs={orgTabs} />}>
                <Route index element={<Overview />} />
                <Route path="tools" element={<Tools />} />
                <Route path="solutions" element={<Solutions />} />
                <Route path="workflows" element={<Workflows />} />
                <Route path="people" element={<div>People Page</div>} />
                <Route path="*" element={<div>Not Found</div>} />
            </Route>
        </Routes>
    );
}
