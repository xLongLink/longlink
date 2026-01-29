import { RouterProvider, createBrowserRouter } from 'react-router';
import { Home } from './pages/Home';
import { Placeholder } from './pages/Placeholder';
import { Navigation } from '@/components/navigation';
import { ThemeProvider } from "@/components/theme-provider"
import { GitBranch, LayoutGrid, Layers, Users, Wrench } from 'lucide-react';

const router = createBrowserRouter([
    {
        path: '/',
        element: <Home />,
    },
    {
        path: '/:org',
        element: (
            <Navigation
                tabs={[
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
                ]}
            />
        ),
        children: [
            { index: true, element: <Placeholder title="Overview" /> },
            { path: 'tools', element: <Placeholder title="Tools" /> },
            { path: 'solutions', element: <Placeholder title="Solutions" /> },
            { path: 'workflows', element: <Placeholder title="Workflows" /> },
            { path: 'people', element: <Placeholder title="People" /> }
        ],
    },
]);

export function App() {
    return (
        <ThemeProvider>
            <RouterProvider router={router} />
        </ThemeProvider>
    );
}
export default App;
