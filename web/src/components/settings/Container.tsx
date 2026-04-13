import { useEffect, useState } from 'react';
import Hero from '@/longlink/Hero';
import { apiFetch } from '@/lib/api';
import { Card } from '@/ui/card';

type ComputeSummary = {
    configured: boolean;
    config: {
        api_server_url: string;
        admin_username: string;
        default_namespace: string;
        verify_ssl: boolean;
    } | null;
    usage: {
        running_pods: number;
        namespaces: number;
        free_bytes: number | null;
    };
};

const formatBytes = (value: number | null) => {
    if (value === null) {
        return 'Not available';
    }

    if (value < 1024) {
        return `${value} B`;
    }

    if (value < 1024 ** 2) {
        return `${(value / 1024).toFixed(1)} KB`;
    }

    if (value < 1024 ** 3) {
        return `${(value / 1024 ** 2).toFixed(1)} MB`;
    }

    return `${(value / 1024 ** 3).toFixed(2)} GB`;
};

export default function Container() {
    const [summary, setSummary] = useState<ComputeSummary | null>(null);

    useEffect(() => {
        const loadSummary = async () => {
            try {
                const result = await apiFetch<ComputeSummary>('/compute');
                setSummary(result);
            } catch {
                setSummary(null);
            }
        };

        void loadSummary();
    }, []);

    const isConfigured = summary?.configured ?? false;

    return (
        <div className="space-y-6">
            <Hero
                title="Compute Settings"
                subtitle="Compute provisioning is configured once from environment variables"
                icon="cpu"
            />

            <Card className="space-y-4 p-6">
                <h3 className="text-base font-semibold">Configuration</h3>
                <p className="text-sm text-muted-foreground">
                    Status: {isConfigured ? 'Configured' : 'Not configured'}
                </p>
                <p className="text-sm text-muted-foreground">
                    API server: {summary?.config?.api_server_url ?? 'Not available'}
                </p>
                <p className="text-sm text-muted-foreground">
                    Admin user: {summary?.config?.admin_username ?? 'Not available'}
                </p>
                <p className="text-sm text-muted-foreground">
                    Default namespace: {summary?.config?.default_namespace ?? 'Not available'}
                </p>
                <p className="text-sm text-muted-foreground">
                    SSL verification: {summary?.config?.verify_ssl ? 'Enabled' : 'Disabled'}
                </p>
            </Card>

            <Card className="space-y-4 p-6">
                <h3 className="text-base font-semibold">Usage</h3>
                <p className="text-sm text-muted-foreground">Namespaces: {summary?.usage.namespaces ?? 0}</p>
                <p className="text-sm text-muted-foreground">Running pods: {summary?.usage.running_pods ?? 0}</p>
                <p className="text-sm text-muted-foreground">
                    Free space: {formatBytes(summary?.usage.free_bytes ?? null)}
                </p>
            </Card>
        </div>
    );
}
