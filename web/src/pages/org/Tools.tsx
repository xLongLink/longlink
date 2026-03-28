import { Plus, Sparkles } from 'lucide-react';
import { useState } from 'react';
import Hero from '@/longlink/Hero';
import Table, { type ApiTableColumn } from '@/longlink/Table';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import {
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/ui/dialog';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/ui/empty';
import { Input } from '@/ui/input';
import { useApps, useCreateApp } from '@/hooks/use-apps';

const tableSchema: { title: string; schema: { columns: ApiTableColumn[] } } = {
    title: 'Tools',
    schema: {
        columns: [
            {
                key: 'name',
                label: 'Name',
                content: {
                    value: '{name}',
                    link: '/apps/{name}',
                },
            },
            {
                key: 'url',
                label: 'URL',
                value: '{url}',
            },
        ],
    },
};

export default function Tools() {
    const { data: apps = [], isLoading, error } = useApps();
    const { mutateAsync: createApp, isPending } = useCreateApp();
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [createError, setCreateError] = useState<string | null>(null);
    const loadErrorMessage =
        error instanceof Error ? error.message : 'Failed to load tools';

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
                err instanceof Error ? err.message : 'Failed to create tool'
            );
        }
    };

    return (
        <div className="space-y-6">
            <Hero
                title="Tools"
                subtitle={`${apps.length} tools`}
                icon="sparkles"
                action="Create Tool"
            >
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Create a new tool</DialogTitle>
                        <DialogDescription>
                            Add a name and URL to register your tool.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-3 md:grid-cols-3">
                        <Input
                            placeholder="Tool name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                        />
                        <Input
                            placeholder="http://localhost:1707/my-tool"
                            value={url}
                            onChange={(event) => setUrl(event.target.value)}
                        />
                        <Button
                            variant="outline"
                            onClick={() => void onCreateApp()}
                            disabled={isPending}
                        >
                            <Plus className="h-4 w-4" />
                            New Tool
                        </Button>
                    </div>

                    {createError ? (
                        <p className="text-sm text-red-300">{createError}</p>
                    ) : null}
                </DialogContent>
            </Hero>

            {isLoading ? (
                <Card className="p-10 text-center text-white/60">
                    Loading tools...
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
                            <EmptyTitle>No Tools Yet</EmptyTitle>
                            <EmptyDescription>
                                You haven&apos;t added any tools yet. Get
                                started by creating your first tool.
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
