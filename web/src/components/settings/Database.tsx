import { useEffect, useState } from 'react';
import Hero from '@/longlink/Hero';
import { apiFetch } from '@/lib/api';
import { Card } from '@/ui/card';

type DatabaseSummary = {
    configured: boolean;
    config: {
        host: string;
        port: number;
        username: string;
        maintenance_database: string;
        sslmode: string | null;
    } | null;
    usage: {
        used_bytes: number | null;
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

export default function Database() {
    const [summary, setSummary] = useState<DatabaseSummary | null>(null);

    useEffect(() => {
        const loadSummary = async () => {
            try {
                const result = await apiFetch<DatabaseSummary>('/database');
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
                title="Database Settings"
                subtitle="Database provisioning is configured once from environment variables"
                icon="settings"
            />

            <Card className="space-y-4 p-6">
                <h3 className="text-base font-semibold">Configuration</h3>
                <p className="text-sm text-muted-foreground">
                    Status: {isConfigured ? 'Configured' : 'Not configured'}
                </p>
                <p className="text-sm text-muted-foreground">Host: {summary?.config?.host ?? 'Not available'}</p>
                <p className="text-sm text-muted-foreground">Port: {summary?.config?.port ?? 'Not available'}</p>
                <p className="text-sm text-muted-foreground">
                    Username: {summary?.config?.username ?? 'Not available'}
                </p>
                <p className="text-sm text-muted-foreground">
                    Maintenance database: {summary?.config?.maintenance_database ?? 'Not available'}
                </p>
                <p className="text-sm text-muted-foreground">SSL mode: {summary?.config?.sslmode ?? 'Not set'}</p>
            </Card>

            <Card className="space-y-4 p-6">
                <h3 className="text-base font-semibold">Usage</h3>
                <p className="text-sm text-muted-foreground">
                    Used space: {formatBytes(summary?.usage.used_bytes ?? null)}
                </p>
                <p className="text-sm text-muted-foreground">
                    Free space: {formatBytes(summary?.usage.free_bytes ?? null)}
                </p>
            </Card>
        </div>
    );
}
