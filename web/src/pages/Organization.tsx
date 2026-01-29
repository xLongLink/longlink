import { Overview } from '@/components/overview';
import { Tools } from '@/components/tools';
import { Workflows } from '@/components/workflows';
import { Solutions } from '@/components/solutions';
import { Routes, Route } from '@/components/navigation';
import { GitBranch, LayoutGrid, Layers, Users, Wrench, BarChart3 } from 'lucide-react';


export function Organization() {
    return (
        <Routes>
            <Route value="overview" label="Overview" path="" icon={<LayoutGrid />}>
                <Overview />
            </Route>
            <Route value="tools" label="Tools" path="tools" icon={<Wrench />}>
                <Tools />
            </Route>
            <Route value="solutions" label="Solutions" path="solutions" icon={<Layers />}>
                <Solutions />
            </Route>
            <Route value="workflows" label="Workflows" path="workflows" icon={<GitBranch />}>
                <Workflows />
            </Route>
            <Route value="people" label="People" path="people" icon={<Users />}>
                <h1>People</h1>
            </Route>
            <Route value="notfound" label="Not Found" path="*" icon={<BarChart3 />}>
                <h1>Not Found</h1>
            </Route>
        </Routes>

    );
}
