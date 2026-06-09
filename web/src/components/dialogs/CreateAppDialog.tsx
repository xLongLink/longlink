import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCreateApp } from '@/hooks/use-org';
import { apiUrl, fetchApiJson } from '@/lib/api';
import type { ApiImageMetadata } from '@/lib/types';
import type { FormEvent } from 'react';
import { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { DynamicIcon } from 'lucide-react/dynamic';

const ICON_OPTIONS = Object.keys(LucideIcons)
    .filter((name) => /^[A-Z]/.test(name))
    .filter((name) => name.endsWith('Icon'))
    .map((name) => name.replace(/Icon$/, '').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase())
    .filter((name) => name.length > 0)
    .sort((left, right) => left.localeCompare(right));

type CreateAppDialogProps = {
    org: string;
};

/** Renders the create-application dialog for an organization. */
export default function CreateAppDialog({ org }: CreateAppDialogProps) {
    const createApp = useCreateApp(org);
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<'image' | 'metadata' | 'envs'>('image');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [icon, setIcon] = useState('');
    const [image, setImage] = useState('');
    const [imageMetadata, setImageMetadata] = useState<ApiImageMetadata | null>(null);
    const [isInspecting, setIsInspecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const steps = [
        { key: 'image', label: 'Image' },
        { key: 'metadata', label: 'Metadata' },
        { key: 'envs', label: 'Envs' },
    ] as const;

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

        // Submit the new app and close the dialog on success.
        try {
            await createApp.mutateAsync({
                name: name.trim(),
                image: image.trim(),
                description: description.trim().length > 0 ? description.trim() : null,
                icon: icon.trim().length > 0 ? icon.trim() : null,
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
                                {step === 'image'
                                    ? 'Provide the packaged image to load app metadata.'
                                    : step === 'metadata'
                                        ? 'Confirm the app metadata before reviewing required envs.'
                                        : 'Review the required environment variables before creating the app.'}
                            </DialogDescription>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {steps.map((item, index) => (
                                <div key={item.key} className="flex items-center gap-2">
                                    <span
                                        className={
                                            item.key === step
                                                ? 'font-medium text-foreground'
                                                : 'text-muted-foreground'
                                        }
                                    >
                                        {index + 1}. {item.label}
                                    </span>
                                    {index < steps.length - 1 ? <span aria-hidden={true}>/</span> : null}
                                </div>
                            ))}
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
                                    <Select value={icon} onValueChange={(value) => setIcon(value === '__none__' ? '' : value ?? '')}>
                                        <SelectTrigger id="application-icon" className="w-full">
                                            <SelectValue placeholder="Choose an icon" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">None</SelectItem>
                                            {ICON_OPTIONS.map((name) => (
                                                <SelectItem key={name} value={name}>
                                                    <DynamicIcon
                                                        name={name as Parameters<typeof DynamicIcon>[0]['name']}
                                                        className="size-4 text-muted-foreground"
                                                    />
                                                    <span>{name}</span>
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
                                <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
                                    <div className="text-sm font-medium text-foreground">Required envs</div>
                                    <div className="text-sm text-muted-foreground">{image}</div>
                                    {imageMetadata?.required_envs.length ? (
                                        <ScrollArea className="max-h-44 pr-3">
                                            <div className="mt-3 space-y-2">
                                                {imageMetadata.required_envs.map((env) => (
                                                    <div key={env.name} className="rounded-lg border border-border bg-background p-3">
                                                        <div className="text-sm font-medium text-foreground">
                                                            {env.name}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">{env.type}</div>
                                                        {env.description ? (
                                                            <p className="mt-1 text-sm text-muted-foreground">{env.description}</p>
                                                        ) : null}
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No required environment variables were reported.</p>
                                    )}
                                </div>

                                <div className="rounded-xl border border-border bg-muted/30 p-3">
                                    <div className="text-sm font-medium text-foreground">Metadata summary</div>
                                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                                        <div>
                                            <span className="text-foreground">Name:</span> {name || '—'}
                                        </div>
                                        <div>
                                            <span className="text-foreground">Description:</span> {description || '—'}
                                        </div>
                                        <div>
                                            <span className="text-foreground">Icon:</span> {icon || '—'}
                                        </div>
                                    </div>
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
