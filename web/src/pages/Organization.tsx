import { Navigation, NavigationTab } from '@/components/navigation';
import { Placeholder } from '@/components/Placeholder';
import { Route, Routes } from 'react-router';
import { Overview } from '@/components/overview';
import { Tools } from '@/components/tools';
import { Workflows } from '@/components/workflows';
import { Solutions } from '@/components/solutions';
import {
    Bug,
    FileText,
    GitBranch,
    LayoutGrid,
    Layers,
    Settings,
    Users,
    Wrench,
} from 'lucide-react';

export function Organization() {
    return (
        <Routes>
            <Route
                element={
                    <Navigation>
                        <NavigationTab
                            value="overview"
                            label="Overview"
                            path=""
                            icon={LayoutGrid}
                        />
                        <NavigationTab
                            value="tools"
                            label="Tools"
                            path="tools"
                            icon={Wrench}
                        />
                        <NavigationTab
                            value="solutions"
                            label="Solutions"
                            path="solutions"
                            icon={Layers}
                        />
                        <NavigationTab
                            value="workflows"
                            label="Workflows"
                            path="workflows"
                            icon={GitBranch}
                        />
                        <NavigationTab
                            value="people"
                            label="People"
                            path="people"
                            icon={Users}
                        />
                    </Navigation>
                }
            >
                <Route index element={<Overview />} />
                <Route path="tools" element={<Tools />} />
                <Route path="solutions" element={<Solutions />} />
                <Route path="workflows" element={<Workflows />} />
                <Route path="people" element={<Placeholder title="People" />} />
            </Route>
            <Route
                path="tools/sample"
                element={
                    <Navigation basePathSuffix="tools/sample">
                        <NavigationTab
                            value="issues"
                            label="Issues"
                            path=""
                            icon={Bug}
                        />
                        <NavigationTab
                            value="files"
                            label="Files"
                            path="files"
                            icon={FileText}
                        />
                        <NavigationTab
                            value="settings"
                            label="Settings"
                            path="settings"
                            icon={Settings}
                        />
                    </Navigation>
                }
            >
                <Route index element={<Placeholder title="Issues" />} />
                <Route path="files" element={<Placeholder title="Files" />} />
                <Route path="settings" element={<Placeholder title="Settings" />} />
            </Route>
        </Routes>
    );
}
