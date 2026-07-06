import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { useTranslation } from '@/lib/i18n';
import type { ApiLocation } from '@/lib/types';
import type { ReactNode } from 'react';

type RegistryDialogShellProps = {
    title: string;
    error: string | null;
    open: boolean;
    children: ReactNode;
    canSubmit: boolean;
    isPending: boolean;
    description: string;
    pendingLabel: string;
    onSubmit: () => Promise<void>;
    onOpenChange: (open: boolean) => void;
};

type RegistryLocationFieldProps = {
    id: string;
    value: string;
    locations: ApiLocation[];
    onValueChange: (value: string) => void;
};

/** Renders the shared shell for registry connection dialogs. */
export function RegistryDialogShell({
    title,
    error,
    open,
    children,
    canSubmit,
    isPending,
    description,
    pendingLabel,
    onSubmit,
    onOpenChange,
}: RegistryDialogShellProps) {
    const { t } = useTranslation();

    return (
        <>
            <Button type="button" onClick={() => onOpenChange(true)}>
                {t('actions.connect')}
            </Button>

            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <DialogTitle>{title}</DialogTitle>
                            <DialogDescription>{description}</DialogDescription>
                        </div>

                        <form
                            className="space-y-4"
                            onSubmit={async (event) => {
                                event.preventDefault();
                                await onSubmit();
                            }}
                        >
                            {children}

                            {error ? <p className="text-sm text-destructive">{error}</p> : null}

                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                    {t('actions.cancel')}
                                </Button>
                                <Button type="submit" disabled={isPending || !canSubmit}>
                                    {isPending ? pendingLabel : t('actions.connect')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

/** Renders a shared location selector for registry connection dialogs. */
export function RegistryLocationField({ id, value, locations, onValueChange }: RegistryLocationFieldProps) {
    const { t } = useTranslation();
    const selectedLocationName = locations.find((location) => location.id === value)?.name;

    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{t('createOrganization.locationLabel')}</Label>
            <Select value={value} onValueChange={(nextValue) => onValueChange(nextValue ?? '')}>
                <SelectTrigger id={id} className="w-full">
                    {selectedLocationName ?? t('dialogs.chooseLocation')}
                </SelectTrigger>
                <SelectContent>
                    {locations.map((location) => (
                        <SelectItem key={location.id} value={String(location.id)}>
                            {location.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
