import { useEffect, useState } from 'react';
import Hero from '@/longlink/Hero';
import { apiFetch } from '@/lib/api';
import { Card } from '@/ui/card';

type StorageSummary = {
    configured: boolean;
    config: {
        endpoint_url: string;
        access_key_id: string;
        region_name: string | null;
    } | null;
    usage: {
        used_bytes: number | null;
        free_bytes: number | null;
        bucket_count: number;
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

export default function Storage() {
    const [summary, setSummary] = useState<StorageSummary | null>(null);

    useEffect(() => {
        const loadSummary = async () => {
            try {
                const result = await apiFetch<StorageSummary>('/storage');
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
                title="Storage Settings"
                subtitle="Storage provisioning is configured once from environment variables"
                icon="settings"
            />

            <Card className="space-y-4 p-6">
                <h3 className="text-base font-semibold">Configuration</h3>
                <p className="text-sm text-muted-foreground">
                    Status: {isConfigured ? 'Configured' : 'Not configured'}
                </p>
                <p className="text-sm text-muted-foreground">
                    Endpoint: {summary?.config?.endpoint_url ?? 'Not available'}
                </p>
                <p className="text-sm text-muted-foreground">
                    Access key: {summary?.config?.access_key_id ?? 'Not available'}
                </p>
                <p className="text-sm text-muted-foreground">Region: {summary?.config?.region_name ?? 'Not set'}</p>
            </Card>

            <Card className="space-y-4 p-6">
                <h3 className="text-base font-semibold">Usage</h3>
                <p className="text-sm text-muted-foreground">Buckets: {summary?.usage.bucket_count ?? 0}</p>
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
