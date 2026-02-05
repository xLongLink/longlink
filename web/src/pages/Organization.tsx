import { Outlet } from 'react-router';
import { Navigation } from '@/components/navigation';
import {
    FileText,
    GitBranch,
    LayoutGrid,
    Layers,
    Users,
    Wrench,
} from 'lucide-react';

export function Organization() {
    const orgTabs = [
        { value: 'overview', label: 'Overview', path: '', icon: LayoutGrid },
        { value: 'tools', label: 'Tools', path: 'tools', icon: Wrench },
        { value: 'text', label: 'Text', path: 'text', icon: FileText },
        { value: 'solutions', label: 'Solutions', path: 'solutions', icon: Layers },
        { value: 'workflows', label: 'Workflows', path: 'workflows', icon: GitBranch },
        { value: 'people', label: 'People', path: 'people', icon: Users },
    ];

    return (
        <Navigation tabs={orgTabs}>
            <Outlet />
        </Navigation>
    );
}
