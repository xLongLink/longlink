import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApiQuery } from '@/hooks/use-api';
import { useOrganizationActions } from '@/hooks/use-organization';
import { useUser } from '@/hooks/use-user';
import { fetchApiJson } from '@/lib/api';
import type { ApiIconCatalog, ApiImageMetadata } from '@/lib/types';
import { type SyntheticEvent, useState } from 'react';

type CreateApplicationDialogProps = {
    organization: string;
};

const platformEnvironmentNames = new Set([
    'LONGLINK_DATABASE_SCHEMA',
    'LONGLINK_DATABASE_URL',
    'LONGLINK_ENV',
    'LONGLINK_STORAGE_BUCKET',
    'LONGLINK_STORAGE_SHARED_BUCKET',
    'LONGLINK_STORAGE_URL',
]);

/** Renders the create-application dialog for an organization. */
export default function CreateApplicationDialog({ organization }: CreateApplicationDialogProps) {
    const { role } = useUser();
    const { createApplication, isCreatingApplication } = useOrganizationActions(organization);
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<'image' | 'metadata' | 'envs'>('image');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [icon, setIcon] = useState('');
    const [image, setImage] = useState('');
    const [imageMetadata, setImageMetadata] = useState<ApiImageMetadata | null>(null);
    const [isInspecting, setIsInspecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { data: iconCatalog } = useApiQuery<ApiIconCatalog>(open ? '/api/icons' : null, { staleTime: Infinity });
    const iconOptions: string[] = iconCatalog?.icons ?? [];
    const visibleIconOptions = icon && !iconOptions.includes(icon) ? [icon, ...iconOptions] : iconOptions;
    const configurableEnvironments =
        imageMetadata?.environments.filter((env) => !platformEnvironmentNames.has(env.name)) ?? [];

    if (role === 'support') {
        return null;
    }

    /** Reset the dialog state when the flow closes or completes. */
    function resetDialogState() {
        setStep('image');
        setName('');
        setDescription('');
        setIcon('');
        setImage('');
        setImageMetadata(null);
        setIsInspecting(false);
        setError(null);
    }

    /** Inspect the image and advance to the app details step. */
    async function handleInspectImage(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setIsInspecting(true);

        try {
            const metadata = await fetchApiJson<ApiImageMetadata>(
                `/api/image?image=${encodeURIComponent(image.trim())}`
            );

            setImageMetadata(metadata);
            setName(metadata.title ?? '');
            setDescription(metadata.description ?? '');
            setStep('metadata');
        } catch (inspectError) {
            setError(inspectError instanceof Error ? inspectError.message : 'Failed to inspect image');
        } finally {
            setIsInspecting(false);
        }
    }

    /** Create the app after the image metadata has been reviewed. */
    async function handleCreateApp(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);

        const envs: Record<string, string> = {};
        // Collect all environment inputs from the final step before creating the app.
        for (const [key, value] of new FormData(event.currentTarget).entries()) {
            if (typeof value !== 'string') {
                continue;
            }

            if (value.length === 0) {
                continue;
            }

            envs[key] = value;
        }

        // Submit the new app and close the dialog on success.
        try {
            await createApplication({
                name: name.trim(),
                image: image.trim(),
                description: description.trim().length > 0 ? description.trim() : null,
                icon: icon.trim().length > 0 ? icon.trim() : null,
                envs,
            });
            setOpen(false);
            resetDialogState();
        } catch (mutationError) {
            setError(mutationError instanceof Error ? mutationError.message : 'Failed to create application');
        }
    }

    return (
        <>
            <Button type="button" onClick={() => setOpen(true)} disabled={organization.length === 0}>
                Create
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
                                    ? 'Inspect image'
                                    : step === 'metadata'
                                      ? 'Review metadata'
                                      : 'Review envs'}
                            </DialogTitle>
                            <DialogDescription>
                                <span className={step === 'image' ? 'font-medium text-foreground' : undefined}>
                                    1. Image
                                </span>
                                <span className="text-muted-foreground"> / </span>
                                <span className={step === 'metadata' ? 'font-medium text-foreground' : undefined}>
                                    2. Metadata
                                </span>
                                <span className="text-muted-foreground"> / </span>
                                <span className={step === 'envs' ? 'font-medium text-foreground' : undefined}>
                                    3. Envs
                                </span>
                            </DialogDescription>
                        </div>

                        {step === 'image' ? (
                            <form className="space-y-4" onSubmit={handleInspectImage}>
                                <div className="space-y-2">
                                    <Label htmlFor="application-image">Image</Label>
                                    <Input
                                        id="application-image"
                                        value={image}
                                        onChange={(event) => setImage(event.target.value)}
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
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={isInspecting || image.trim().length === 0}>
                                        {isInspecting ? 'Inspecting...' : 'Inspect image'}
                                    </Button>
                                </div>
                            </form>
                        ) : step === 'metadata' ? (
                            <form
                                className="space-y-4"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    if (name.trim().length > 0 && image.trim().length > 0) {
                                        setStep('envs');
                                    }
                                }}
                            >
                                <div className="space-y-2">
                                    <Label htmlFor="application-name">Name</Label>
                                    <Input
                                        id="application-name"
                                        value={name}
                                        onChange={(event) => setName(event.target.value)}
                                        placeholder="dashboard"
                                        autoComplete="off"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="application-description">Description</Label>
                                    <Input
                                        id="application-description"
                                        value={description}
                                        onChange={(event) => setDescription(event.target.value)}
                                        placeholder="Dashboard app"
                                        autoComplete="off"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="application-icon">Icon</Label>
                                    <Select
                                        value={icon}
                                        onValueChange={(value) => setIcon(value === '__none__' ? '' : (value ?? ''))}
                                    >
                                        <SelectTrigger id="application-icon" className="w-full">
                                            {icon ? (
                                                <Icon name={icon} className="size-4 text-muted-foreground" />
                                            ) : null}
                                            <SelectValue placeholder="Choose an icon" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">None</SelectItem>
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
                                        Back
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
                                            Cancel
                                        </Button>
                                        <Button
                                            type="button"
                                            disabled={name.trim().length === 0 || image.trim().length === 0}
                                            onClick={() => setStep('envs')}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        ) : (
                            <form className="space-y-4" onSubmit={handleCreateApp}>
                                {configurableEnvironments.length ? (
                                    <ScrollArea className="max-h-80 pr-3">
                                        <div className="space-y-4">
                                            {configurableEnvironments.map((env) => (
                                                <div key={env.name} className="space-y-2">
                                                    <Label htmlFor={`env-${env.name}`}>
                                                        {env.name}{' '}
                                                        <span className="text-muted-foreground">
                                                            {env.required ? '(required)' : '(optional)'}
                                                        </span>
                                                    </Label>
                                                    <Input
                                                        id={`env-${env.name}`}
                                                        name={env.name}
                                                        required={env.required}
                                                        placeholder={env.description ?? `Enter ${env.name}`}
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
                                        Back
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
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={
                                                isCreatingApplication ||
                                                name.trim().length === 0 ||
                                                image.trim().length === 0
                                            }
                                        >
                                            {isCreatingApplication ? 'Creating...' : 'Create'}
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
