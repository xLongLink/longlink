import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { CreateToolDialog } from '@/components/dialogs';
import Hero from '@/longlink/Hero';
import Table, { type ApiTableColumn } from '@/longlink/Table';
import { Card } from '@/ui/card';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/ui/empty';
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
    const [url, setUrl] = useState('');
    const [token, setToken] = useState('');
    const [createError, setCreateError] = useState<string | null>(null);
    const loadErrorMessage =
        error instanceof Error ? error.message : 'Failed to load tools';

    const onCreateApp = async () => {
        if (!url.trim() || !token.trim()) {
            return;
        }

        try {
            setCreateError(null);
            await createApp({
                url: url.trim(),
                token: token.trim(),
            });
            setUrl('');
            setToken('');
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
                icon="blocks"
                action="Create Tool"
            >
                <CreateToolDialog
                    url={url}
                    token={token}
                    isPending={isPending}
                    createError={createError}
                    onUrlChange={setUrl}
                    onTokenChange={setToken}
                    onCreate={() => void onCreateApp()}
                />
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
