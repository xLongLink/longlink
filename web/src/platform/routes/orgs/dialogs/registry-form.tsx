import { api } from '@/lib/api';
import { InfoIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/shadcn/input';
import { useSubmit } from '@/lib/hooks/use-submit';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@/components/longlink/action/link';
import { Stack } from '@/components/longlink/layout/stack';
import { Button } from '@/components/longlink/action/button';
import { Dialog } from '@/components/longlink/layout/dialog';
import { Heading } from '@/components/longlink/display/heading';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { Field, FieldError, FieldLabel } from '@/components/shadcn/field';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/shadcn/tooltip';

export function RegistryForm({
    base,
    onSuccess,
    onOpenChange
}: {
    onOpenChange: (open: boolean) => void;
    base: string;
    onSuccess: () => Promise<void>;
}) {
    const form = useForm({ resolver: zodResolver(schemas.zRegistryCreateWritable), defaultValues: { credential: '' } });

    async function save(data: { credential: string }) {
        await api.post(`${base}/registries`, { json: data });
        await onSuccess();
    }

    const submit = useSubmit(save, {
        onError: () => form.setError('root', { message: 'Could not save the registry. Please try again.' })
    });

    return (
        <Dialog open onOpenChange={onOpenChange} title="Connect a registry" showHeader={false} bodyPadding={false}>
            <form
                className="grid min-h-full grid-cols-1 items-center sm:grid-cols-2"
                onSubmit={form.handleSubmit(submit)}
                noValidate
                aria-busy={form.formState.isSubmitting}
            >
                <fieldset disabled={form.formState.isSubmitting} className="flex min-w-0 flex-col gap-2 border-0 p-6">
                    <div className="mb-2">
                        <Heading level={2} size={4} align="center">
                            GitHub Container Registry (ghcr.io)
                        </Heading>
                    </div>
                    <Field data-invalid={Boolean(form.formState.errors.credential)}>
                        <Stack direction="horizontal" align="center" justify="between" gap={2}>
                            <FieldLabel htmlFor="registry-credential">Personal access token (classic)</FieldLabel>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger
                                        type="button"
                                        aria-label="Token scope requirements"
                                        className="shrink-0 text-muted-foreground hover:text-foreground"
                                    >
                                        <InfoIcon className="size-4" aria-hidden="true" />
                                    </TooltipTrigger>
                                    <TooltipContent>Requires the read:packages scope.</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </Stack>
                        <Input
                            {...form.register('credential')}
                            id="registry-credential"
                            type="password"
                            placeholder="ghp_..."
                            autoComplete="new-password"
                            aria-invalid={Boolean(form.formState.errors.credential)}
                        />
                        <FieldError errors={[form.formState.errors.credential]} />
                    </Field>
                    <FieldError errors={[form.formState.errors.root]} />
                    <Stack direction="horizontal" align="center" justify="between" gap={2}>
                        <Link disabled={form.formState.isSubmitting} onClick={() => onOpenChange(false)}>
                            Cancel
                        </Link>
                        <Button type="submit">Save</Button>
                    </Stack>
                </fieldset>
                <Stack
                    direction="horizontal"
                    gap={0}
                    align="center"
                    justify="center"
                    padding={6}
                    className="h-full bg-black/10 dark:bg-black/20"
                >
                    <img
                        src="/images/lock.png"
                        alt=""
                        width={1327}
                        height={1186}
                        decoding="async"
                        className="w-full max-w-72 object-contain invert dark:invert-0"
                    />
                </Stack>
            </form>
        </Dialog>
    );
}
