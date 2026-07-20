import { z } from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApiJson } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useUserProfile } from '@/hooks/use-user';
import { apiDatabaseRegistrySchema, parseApiResponse } from '@/lib/api-schemas';
import { databasesQueryKey, infrastructureOptionsQueryKey } from '@/lib/query-keys';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

const schema = z.object({
    name: z.string().trim().min(1),
    host: z.string().trim().min(1),
    port: z.coerce.number().int().min(1).max(65535),
    username: z.string().trim().min(1),
    password: z.string().min(1),
});

type InputValues = z.input<typeof schema>;
type Values = z.output<typeof schema>;

/** Registers one database backend. */
export default function CreateDatabase() {
    const { t } = useTranslation();
    const { role } = useUserProfile();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const form = useForm<InputValues, unknown, Values>({
        defaultValues: { name: '', host: '', port: '5432', username: '', password: '' },
        mode: 'onChange',
        resolver: zodResolver(schema),
    });
    const mutation = useMutation({
        mutationFn: async (payload: Values) =>
            fetchApiJson(
                '/api/databases',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...payload, kind: 'postgresql' }),
                },
                (value) => parseApiResponse(apiDatabaseRegistrySchema, value)
            ),
        onSuccess: async () => {
            setOpen(false);
            resetDialogState();
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: databasesQueryKey() }),
                queryClient.invalidateQueries({ queryKey: infrastructureOptionsQueryKey() }),
            ]);
        },
    });

    // Only administrators can register infrastructure.
    if (role !== 'administrator') {
        return null;
    }

    /** Clears connection secrets and errors when the dialog closes. */
    function resetDialogState() {
        form.reset();
        setError(null);
    }

    return (
        <>
            <Button type="button" onClick={() => setOpen(true)}>
                {t('dialogs.connectDatabaseTitle')}
            </Button>
            <Dialog
                open={open}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen && mutation.isPending) {
                        return;
                    }
                    setOpen(nextOpen);
                    if (!nextOpen) {
                        resetDialogState();
                    }
                }}
            >
                <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
                    <DialogTitle>{t('dialogs.connectDatabaseTitle')}</DialogTitle>
                    <DialogDescription>{t('dialogs.connectDatabaseDescription')}</DialogDescription>
                    <form
                        className="space-y-4"
                        onSubmit={form.handleSubmit(async (payload) => {
                            setError(null);
                            try {
                                await mutation.mutateAsync(payload);
                            } catch (mutationError) {
                                setError(
                                    mutationError instanceof Error
                                        ? mutationError.message
                                        : t('dialogs.failedConnectDatabase')
                                );
                            }
                        })}
                    >
                        <div className="space-y-2">
                            <Label htmlFor="database-name">{t('labels.name')}</Label>
                            <Input id="database-name" {...form.register('name')} autoComplete="off" />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
                            <div className="space-y-2">
                                <Label htmlFor="database-host">{t('labels.host')}</Label>
                                <Input id="database-host" {...form.register('host')} autoComplete="off" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="database-port">{t('labels.port')}</Label>
                                <Input id="database-port" type="number" {...form.register('port')} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="database-username">{t('labels.username')}</Label>
                            <Input id="database-username" {...form.register('username')} autoComplete="off" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="database-password">{t('labels.password')}</Label>
                            <Input
                                id="database-password"
                                type="password"
                                {...form.register('password')}
                                autoComplete="new-password"
                            />
                        </div>
                        {error ? <p className="text-sm text-destructive">{error}</p> : null}
                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={mutation.isPending}
                                onClick={() => {
                                    setOpen(false);
                                    resetDialogState();
                                }}
                            >
                                {t('actions.cancel')}
                            </Button>
                            <Button type="submit" disabled={mutation.isPending || !form.formState.isValid}>
                                {mutation.isPending ? t('actions.creating') : t('actions.create')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
