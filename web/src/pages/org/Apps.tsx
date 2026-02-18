import { Plus, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { useApps } from '@/hooks/use-apps';

export default function Apps() {
    const { apps, isLoading, error, createApp } = useApps();
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    const onCreateApp = async () => {
        if (!name.trim() || !url.trim()) {
            return;
        }

        try {
            setIsCreating(true);
            setCreateError(null);
            await createApp({
                name: name.trim(),
                url: url.trim(),
            });
            setName('');
            setUrl('');
        } catch (err) {
            setCreateError(
                err instanceof Error ? err.message : 'Failed to create app'
            );
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/30">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold text-white">
                            Apps
                        </h1>
                        <p className="text-sm text-white/60">
                            {apps.length} apps
                        </p>
                    </div>
                </div>
            </div>

            <Card className="space-y-3 p-4">
                <p className="text-sm text-white/60">Create a new app</p>
                <div className="grid gap-3 md:grid-cols-3">
                    <Input
                        placeholder="App name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                    />
                    <Input
                        placeholder="http://localhost:1707/my-app"
                        value={url}
                        onChange={(event) => setUrl(event.target.value)}
                    />
                    <Button
                        variant="outline"
                        onClick={() => void onCreateApp()}
                        disabled={isCreating}
                    >
                        <Plus className="h-4 w-4" />
                        New App
                    </Button>
                </div>
                {createError ? (
                    <p className="text-sm text-red-300">{createError}</p>
                ) : null}
            </Card>

            {isLoading ? (
                <Card className="p-10 text-center text-white/60">
                    Loading apps...
                </Card>
            ) : error ? (
                <Card className="p-10 text-center text-red-300">{error}</Card>
            ) : apps.length === 0 ? (
                <Card className="p-10 text-center">
                    <Empty>
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Sparkles />
                            </EmptyMedia>
                            <EmptyTitle>No Apps Yet</EmptyTitle>
                            <EmptyDescription>
                                You haven&apos;t added any apps yet. Get started
                                by creating your first app.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                </Card>
            ) : (
                <div className="grid gap-3">
                    {apps.map((app) => (
                        <Link key={app.id} to={`/apps/${app.name}`}>
                            <Card className="space-y-1 p-4 transition hover:bg-white/5">
                                <h2 className="font-medium text-white">
                                    {app.name}
                                </h2>
                                <p className="text-sm text-white/60">
                                    {app.url}
                                </p>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
