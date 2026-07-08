import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApiQuery } from '@/hooks/use-api';
import { useOrganizationActions } from '@/hooks/use-organization';
import { useUserProfile } from '@/hooks/use-user';
import { apiIconsSchema, apiImageMetadataSchema, parseApiResponse } from '@/lib/api-schemas';
import { fetchApiJson } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { canCreateApplication } from '@/lib/roles';
import type { ApiImageMetadata } from '@/lib/types';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

type CreateApplicationDialogProps = {
    organization: string;
};

const platformEnvironmentNames = new Set([
    'LONGLINK_DATABASE_HOST',
    'LONGLINK_DATABASE_NAME',
    'LONGLINK_DATABASE_PASSWORD',
    'LONGLINK_DATABASE_PORT',
    'LONGLINK_DATABASE_SCHEMA',
    'LONGLINK_DATABASE_USERNAME',
    'LONGLINK_ENV',
    'LONGLINK_STORAGE_BUCKET',
    'LONGLINK_STORAGE_ENDPOINT_URL',
    'LONGLINK_STORAGE_PASSWORD',
    'LONGLINK_STORAGE_SHARED_BUCKET',
    'LONGLINK_STORAGE_USERNAME',
]);

const createApplicationFormSchema = z.object({
    image: z.string().trim().min(1),
    name: z.string().trim(),
    description: z.string().trim(),
    icon: z.string().trim(),
    envs: z.record(z.string(), z.string()).default({}),
});

const createApplicationSubmitSchema = createApplicationFormSchema.extend({
    name: z.string().trim().min(1),
});

type CreateApplicationInput = z.input<typeof createApplicationFormSchema>;
type CreateApplicationValues = z.output<typeof createApplicationFormSchema>;

const defaultCreateApplicationValues = {
    image: '',
    name: '',
    description: '',
    icon: '',
    envs: {},
} satisfies CreateApplicationInput;

/** Renders the create-application dialog for an organization. */
export default function CreateApplicationDialog({ organization }: CreateApplicationDialogProps) {
    const { t } = useTranslation();
    const { organizations } = useUserProfile();
    const { createApplication, isCreatingApplication } = useOrganizationActions(organization);
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<'image' | 'metadata' | 'envs'>('image');
    const [imageMetadata, setImageMetadata] = useState<ApiImageMetadata | null>(null);
    const [isInspecting, setIsInspecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const form = useForm<CreateApplicationInput, unknown, CreateApplicationValues>({
        defaultValues: defaultCreateApplicationValues,
        mode: 'onChange',
        resolver: zodResolver(createApplicationFormSchema),
    });
    const values = form.watch();
    const { data: iconCatalog } = useApiQuery<string[]>(open ? '/api/icons' : null, {
        parse: (value) => parseApiResponse(apiIconsSchema, value),
        staleTime: Infinity,
    });
    const iconOptions: string[] = iconCatalog ?? [];
    const visibleIconOptions = values.icon && !iconOptions.includes(values.icon) ? [values.icon, ...iconOptions] : iconOptions;
    const configurableEnvironments =
        imageMetadata?.environments.filter((env) => !platformEnvironmentNames.has(env.name)) ?? [];
    const organizationMembership = organizations.find((item) => item.slug === organization);

    if (!canCreateApplication(organizationMembership?.role)) {
        return null;
    }

    /** Reset the dialog state when the flow closes or completes. */
    function resetDialogState() {
        setStep('image');
        form.reset(defaultCreateApplicationValues);
        setImageMetadata(null);
        setIsInspecting(false);
        setError(null);
    }

    /** Inspect the image and advance to the app details step. */
    async function handleInspectImage(payload: CreateApplicationValues) {
        setError(null);
        setIsInspecting(true);

        try {
            const query = new URLSearchParams({ image: payload.image });
            const metadata = await fetchApiJson(
                `/api/image?${query.toString()}`,
                undefined,
                (value) => parseApiResponse(apiImageMetadataSchema, value)
            );

            setImageMetadata(metadata);
            form.setValue('name', metadata.title ?? '', { shouldValidate: true });
            form.setValue('description', metadata.description ?? '', { shouldValidate: true });
            form.setValue('envs', {}, { shouldValidate: true });
            setStep('metadata');
        } catch (inspectError) {
            setError(inspectError instanceof Error ? inspectError.message : t('dialogs.inspectImageFailed'));
        } finally {
            setIsInspecting(false);
        }
    }

    /** Create the app after the image metadata has been reviewed. */
    async function handleCreateApp(payload: CreateApplicationValues) {
        setError(null);

        const application = createApplicationSubmitSchema.safeParse(payload);
        if (!application.success) {
            setError(t('dialogs.createApplicationFailed'));
            return;
        }

        const envs: Record<string, string> = {};
        // Collect configured environment values while skipping optional empty fields.
        for (const [key, value] of Object.entries(application.data.envs)) {
            if (value.length === 0) {
                continue;
            }

            envs[key] = value;
        }

        // Submit the new app and close the dialog on success.
        try {
            await createApplication({
                name: application.data.name,
                image: application.data.image,
                description: application.data.description.length > 0 ? application.data.description : null,
                icon: application.data.icon.length > 0 ? application.data.icon : null,
                envs,
            });
            setOpen(false);
            resetDialogState();
        } catch (mutationError) {
            setError(mutationError instanceof Error ? mutationError.message : t('dialogs.createApplicationFailed'));
        }
    }

    return (
        <>
            <Button type="button" onClick={() => setOpen(true)} disabled={organization.length === 0}>
                {t('actions.create')}
            </Button>

            <Dialog
                open={open}
                onOpenChange={(nextOpen) => {
                    setOpen(nextOpen);
                    if (!nextOpen) {
                        resetDialogState();
                    }
                }}
            >
                <DialogContent className={step === 'envs' ? 'sm:max-w-lg' : undefined}>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <DialogTitle>
                                {step === 'image'
                                    ? t('dialogs.inspectImage')
                                    : step === 'metadata'
                                      ? t('dialogs.reviewMetadata')
                                      : t('dialogs.reviewEnvs')}
                            </DialogTitle>
                            <DialogDescription>
                                <span className={step === 'image' ? 'font-medium text-foreground' : undefined}>
                                    {t('dialogs.stepImage')}
                                </span>
                                <span className="text-muted-foreground"> / </span>
                                <span className={step === 'metadata' ? 'font-medium text-foreground' : undefined}>
                                    {t('dialogs.stepMetadata')}
                                </span>
                                <span className="text-muted-foreground"> / </span>
                                <span className={step === 'envs' ? 'font-medium text-foreground' : undefined}>
                                    {t('dialogs.stepEnvs')}
                                </span>
                            </DialogDescription>
                        </div>

                        {step === 'image' ? (
                            <form className="space-y-4" onSubmit={form.handleSubmit(handleInspectImage)}>
                                <div className="space-y-2">
                                    <Label htmlFor="application-image">{t('labels.image')}</Label>
                                    <Input
                                        id="application-image"
                                        {...form.register('image')}
                                        placeholder="ghcr.io/longlink/dashboard:latest"
                                        autoComplete="off"
                                    />
                                </div>

                                {error ? <p className="text-sm text-destructive">{error}</p> : null}

                                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setOpen(false);
                                            resetDialogState();
                                        }}
                                    >
                                        {t('actions.cancel')}
                                    </Button>
                                    <Button type="submit" disabled={isInspecting || values.image.trim().length === 0}>
                                        {isInspecting ? t('dialogs.inspecting') : t('dialogs.inspectImage')}
                                    </Button>
                                </div>
                            </form>
                        ) : step === 'metadata' ? (
                            <form
                                className="space-y-4"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    if (values.name.trim().length > 0 && values.image.trim().length > 0) {
                                        setStep('envs');
                                    }
                                }}
                            >
                                <div className="space-y-2">
                                    <Label htmlFor="application-name">{t('labels.name')}</Label>
                                    <Input
                                        id="application-name"
                                        {...form.register('name')}
                                        placeholder="dashboard"
                                        autoComplete="off"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="application-description">{t('labels.description')}</Label>
                                    <Input
                                        id="application-description"
                                        {...form.register('description')}
                                        placeholder="Dashboard app"
                                        autoComplete="off"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="application-icon">{t('labels.icon')}</Label>
                                    <Select
                                        value={values.icon}
                                        onValueChange={(value) =>
                                            form.setValue('icon', value === '__none__' ? '' : (value ?? ''), {
                                                shouldValidate: true,
                                            })
                                        }
                                    >
                                        <SelectTrigger id="application-icon" className="w-full">
                                            {values.icon ? (
                                                <Icon name={values.icon} className="size-4 text-muted-foreground" />
                                            ) : null}
                                            <SelectValue placeholder={t('dialogs.chooseIcon')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">{t('dialogs.none')}</SelectItem>
                                            {visibleIconOptions.map((name) => (
                                                <SelectItem key={name} value={name}>
                                                    {name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {error ? <p className="text-sm text-destructive">{error}</p> : null}

                                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setStep('image');
                                            setError(null);
                                        }}
                                    >
                                        {t('actions.back')}
                                    </Button>
                                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setOpen(false);
                                                resetDialogState();
                                            }}
                                        >
                                            {t('actions.cancel')}
                                        </Button>
                                        <Button
                                            type="button"
                                            disabled={values.name.trim().length === 0 || values.image.trim().length === 0}
                                            onClick={() => setStep('envs')}
                                        >
                                            {t('actions.next')}
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        ) : (
                            <form className="space-y-4" onSubmit={form.handleSubmit(handleCreateApp)}>
                                {configurableEnvironments.length ? (
                                    <ScrollArea className="max-h-80 pr-3">
                                        <div className="space-y-4">
                                            {configurableEnvironments.map((env) => (
                                                <div key={env.name} className="space-y-2">
                                                    <Label htmlFor={`env-${env.name}`}>
                                                        {env.name}{' '}
                                                        <span className="text-muted-foreground">
                                                            (
                                                            {env.required
                                                                ? t('dialogs.required')
                                                                : t('dialogs.optional')}
                                                            )
                                                        </span>
                                                    </Label>
                                                    <Input
                                                        id={`env-${env.name}`}
                                                        {...form.register(`envs.${env.name}` as `envs.${string}`, {
                                                            required: env.required,
                                                        })}
                                                        placeholder={
                                                            env.description ??
                                                            t('dialogs.enterEnvironment', { name: env.name })
                                                        }
                                                        autoComplete="off"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                ) : null}

                                {error ? <p className="text-sm text-destructive">{error}</p> : null}

                                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setStep('metadata');
                                            setError(null);
                                        }}
                                    >
                                        {t('actions.back')}
                                    </Button>
                                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setOpen(false);
                                                resetDialogState();
                                            }}
                                        >
                                            {t('actions.cancel')}
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={
                                                isCreatingApplication ||
                                                values.name.trim().length === 0 ||
                                                values.image.trim().length === 0 ||
                                                !form.formState.isValid
                                            }
                                        >
                                            {isCreatingApplication ? t('actions.creating') : t('actions.create')}
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
