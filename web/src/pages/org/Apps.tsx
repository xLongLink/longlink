import { Plus, Sparkles } from 'lucide-react';
import { useState } from 'react';
import Hero from '@/components/longlink/Hero';
import Table, { type ApiTableColumn } from '@/components/longlink/Table';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { useApps, useCreateApp } from '@/hooks/use-apps';

const tableSchema: { title: string; schema: { columns: ApiTableColumn[] } } = {
    title: 'Apps',
    schema: {
        columns: [
            {
                key: 'name',
                label: 'Name',
                value: '{name}',
            },
            {
                key: 'url',
                label: 'URL',
                value: '{url}',
            },
        ],
    },
};

export default function Apps() {
    const { data: apps = [], isLoading, error } = useApps();
    const { mutateAsync: createApp, isPending } = useCreateApp();
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [createError, setCreateError] = useState<string | null>(null);
    const loadErrorMessage =
        error instanceof Error ? error.message : 'Failed to load apps';

    const onCreateApp = async () => {
        if (!name.trim() || !url.trim()) {
            return;
        }

        try {
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
        }
    };

    return (
        <div className="space-y-6">
            <Hero
                title="Apps"
                subtitle={`${apps.length} apps`}
                icon="sparkles"
                action="Create New App"
            >
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Create a new app</DialogTitle>
                        <DialogDescription>
                            Add a name and URL to register your app.
                        </DialogDescription>
                    </DialogHeader>

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
                            disabled={isPending}
                        >
                            <Plus className="h-4 w-4" />
                            New App
                        </Button>
                    </div>

                    {createError ? (
                        <p className="text-sm text-red-300">{createError}</p>
                    ) : null}
                </DialogContent>
            </Hero>

            {isLoading ? (
                <Card className="p-10 text-center text-white/60">
                    Loading apps...
                </Card>
            ) : error ? (
                <Card className="p-10 text-center text-red-300">
                    {loadErrorMessage}
                </Card>
            ) : apps.length === 0 ? (
                <Card className="p-10 text-center">
                    <Empty>
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Sparkles className="h-5 w-5" />
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
                <Table endpoint="/apps" schema={tableSchema} />
            )}
        </div>
    );
}
