import { RouterProvider, createBrowserRouter } from 'react-router';
import { ThemeProvider } from "@/components/theme"
import { Home } from '@/pages/Home';
import { Module } from '@/pages/Module';
import { Organization } from '@/pages/Organization';


const router = createBrowserRouter([
    { path: '/', element: <Home /> },
    {
        path: '/:org/*',
        element: <Organization />,
    },
    {
        path: '/:org/tools/:tool*',
        element: <Module />,
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
