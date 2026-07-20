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
import { Textarea } from '@/components/ui/textarea';
import { computesQueryKey, infrastructureOptionsQueryKey } from '@/lib/query-keys';
import { apiComputeMutationResponseSchema, parseApiResponse } from '@/lib/api-schemas';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

const schema = z.object({
    name: z.string().trim().min(1),
    kubeconfig: z.string().refine((value) => value.trim().length > 0),
});

type Values = z.infer<typeof schema>;

/** Registers one compute target. */
export default function CreateCompute() {
    const { t } = useTranslation();
    const { role } = useUserProfile();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const form = useForm<Values>({
        defaultValues: { name: '', kubeconfig: '' },
        mode: 'onChange',
        resolver: zodResolver(schema),
    });
    const mutation = useMutation({
        mutationFn: async (payload: Values) =>
            fetchApiJson(
                '/api/computes',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                },
                (value) => parseApiResponse(apiComputeMutationResponseSchema, value)
            ),
        onSuccess: async () => {
            setOpen(false);
            resetDialogState();
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: computesQueryKey() }),
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
                {t('dialogs.connectComputeTitle')}
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
                <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
                    <DialogTitle>{t('dialogs.connectComputeTitle')}</DialogTitle>
                    <DialogDescription>{t('dialogs.connectComputeDescription')}</DialogDescription>
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
                                        : t('dialogs.failedConnectCompute')
                                );
                            }
                        })}
                    >
                        <div className="space-y-2">
                            <Label htmlFor="compute-name">{t('labels.name')}</Label>
                            <Input id="compute-name" {...form.register('name')} autoComplete="off" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="compute-kubeconfig">{t('labels.kubeconfig')}</Label>
                            <Textarea
                                id="compute-kubeconfig"
                                {...form.register('kubeconfig')}
                                rows={12}
                                className="font-mono text-xs"
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
