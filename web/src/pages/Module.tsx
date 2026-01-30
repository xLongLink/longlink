import { Navigation } from '@/components/navigation';
import { Navigate, Route, Routes, useParams } from 'react-router';
import { Workflows } from '@/components/workflows';
import { Solutions } from '@/components/solutions';
import { FileText, Settings, Ticket } from 'lucide-react';
import { Files } from '@/components/files';

const moduleTabs = [
    {
        value: 'files',
        label: 'Files',
        path: 'files',
        icon: FileText,
    },
    {
        value: 'tickets',
        label: 'Tickets',
        path: 'tickets',
        icon: Ticket,
    },
    {
        value: 'settings',
        label: 'Settings',
        path: 'settings',
        icon: Settings,
    },
];

export function Module() {
    const { tool } = useParams();
    const basePathSuffix = tool ? `tools/${tool}` : 'tools';

    return (
        <Routes>
            <Route
                element={
                    <Navigation
                        tabs={moduleTabs}
                        basePathSuffix={basePathSuffix}
                    />
                }
            >
                <Route index element={<Navigate to="files" replace />} />
                <Route path="files" element={<Files />} />
                <Route path="tickets" element={<Solutions />} />
                <Route path="settings" element={<Workflows />} />
            </Route>
        </Routes>
    );
}
