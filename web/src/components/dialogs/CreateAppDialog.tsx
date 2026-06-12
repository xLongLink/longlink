import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUser } from '@/hooks/use-user';
import { useCreateApp } from '@/hooks/use-org';
import { apiUrl, fetchApiJson } from '@/lib/api';
import type { ApiImageMetadata } from '@/lib/types';
import type { FormEvent, UIEvent } from 'react';
import { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { DynamicIcon } from 'lucide-react/dynamic';

const ICON_OPTIONS = Object.keys(LucideIcons)
    .filter((name) => /^[A-Z]/.test(name))
    .filter((name) => name.endsWith('Icon'))
    .map((name) => name.replace(/Icon$/, '').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase())
    .filter((name) => name.length > 0)
    .sort((left, right) => left.localeCompare(right));

const ICON_OPTION_BATCH_SIZE = 80;
const ICON_OPTION_SCROLL_THRESHOLD = 48;

type CreateAppDialogProps = {
    org: string;
};

/** Renders the create-application dialog for an organization. */
export default function CreateAppDialog({ org }: CreateAppDialogProps) {
    const { role } = useUser();
    const createApp = useCreateApp(org);
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<'image' | 'metadata' | 'envs'>('image');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [icon, setIcon] = useState('');
    const [image, setImage] = useState('');
    const [imageMetadata, setImageMetadata] = useState<ApiImageMetadata | null>(null);
    const [isInspecting, setIsInspecting] = useState(false);
    const [visibleIconCount, setVisibleIconCount] = useState(ICON_OPTION_BATCH_SIZE);
    const [error, setError] = useState<string | null>(null);
    const visibleIconOptions = ICON_OPTIONS.slice(0, visibleIconCount);

    if (role === 'support') {
        return null;
    }

    if (icon.length > 0 && !visibleIconOptions.includes(icon)) {
        visibleIconOptions.push(icon);
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
        setVisibleIconCount(ICON_OPTION_BATCH_SIZE);
        setError(null);
    }

    /** Load more icon choices as the icon select scroll reaches the bottom. */
    function handleIconOptionsScroll(event: UIEvent<HTMLElement>) {
        const target = event.currentTarget;

        if (target.scrollTop + target.clientHeight < target.scrollHeight - ICON_OPTION_SCROLL_THRESHOLD) {
            return;
        }

        setVisibleIconCount((count) => Math.min(count + ICON_OPTION_BATCH_SIZE, ICON_OPTIONS.length));
    }

    /** Inspect the image and advance to the app details step. */
    async function handleInspectImage(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setIsInspecting(true);

        try {
            const metadata = await fetchApiJson<ApiImageMetadata>(apiUrl(`/api/image?image=${encodeURIComponent(image.trim())}`), {
                credentials: 'include',
            });

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
    async function handleCreateApp(event: FormEvent<HTMLFormElement>) {
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
            await createApp.mutateAsync({
                name: name.trim(),
                image: image.trim(),
                description: description.trim().length > 0 ? description.trim() : null,
                icon: icon.trim().length > 0 ? icon.trim() : null,
                envs,
            });
            setOpen(false);
            resetDialogState();
        } catch (mutationError) {
            setError(mutationError instanceof Error ? mutationError.message : 'Failed to create app');
        }
    }

    return (
        <>
            <Button type="button" onClick={() => setOpen(true)} disabled={org.length === 0}>
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
                                {step === 'image' ? 'Inspect image' : step === 'metadata' ? 'Review metadata' : 'Review envs'}
                            </DialogTitle>
                            <DialogDescription>
                                <span className={step === 'image' ? 'font-medium text-foreground' : undefined}>1. Image</span>
                                <span className="text-muted-foreground"> / </span>
                                <span className={step === 'metadata' ? 'font-medium text-foreground' : undefined}>2. Metadata</span>
                                <span className="text-muted-foreground"> / </span>
                                <span className={step === 'envs' ? 'font-medium text-foreground' : undefined}>3. Envs</span>
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
                            <form className="space-y-4" onSubmit={handleCreateApp}>
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
                                                <DynamicIcon
                                                    name={icon as Parameters<typeof DynamicIcon>[0]['name']}
                                                    className="size-4 text-muted-foreground"
                                                    aria-hidden="true"
                                                />
                                            ) : null}
                                            <SelectValue placeholder="Choose an icon" />
                                        </SelectTrigger>
                                        <SelectContent onScroll={handleIconOptionsScroll}>
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
                                {imageMetadata?.required_envs.length || imageMetadata?.optional_envs.length ? (
                                    <ScrollArea className="max-h-80 pr-3">
                                        <div className="space-y-4">
                                            {imageMetadata.required_envs.map((env) => (
                                                <div key={`required-${env.name}`} className="space-y-2">
                                                    <Label htmlFor={`required-env-${env.name}`}>
                                                        {env.name} <span className="text-muted-foreground">(required)</span>
                                                    </Label>
                                                    <Input
                                                        id={`required-env-${env.name}`}
                                                        name={env.name}
                                                        required={true}
                                                        placeholder={env.description ?? `Enter ${env.name}`}
                                                        autoComplete="off"
                                                    />
                                                </div>
                                            ))}

                                            {imageMetadata.optional_envs.map((env) => (
                                                <div key={`optional-${env.name}`} className="space-y-2">
                                                    <Label htmlFor={`optional-env-${env.name}`}>
                                                        {env.name} <span className="text-muted-foreground">(Optional)</span>
                                                    </Label>
                                                    <Input
                                                        id={`optional-env-${env.name}`}
                                                        name={env.name}
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
                                            type="submit"
                                            disabled={createApp.isPending || name.trim().length === 0 || image.trim().length === 0}
                                        >
                                            {createApp.isPending ? 'Creating...' : 'Create'}
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
