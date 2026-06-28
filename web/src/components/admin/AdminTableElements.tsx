import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ApiLocation } from '@/lib/types';
import { MoreVertical } from 'lucide-react';
import { toast } from 'sonner';

type AdminLocationBadgeProps = {
    fallbackId?: string;
    location?: ApiLocation;
};

type AdminActionMenuProps = {
    label: string;
    copyLabel: string;
    copyValue: string;
    onDelete: () => void;
};

/** Renders a compact location badge for admin tables. */
export function AdminLocationBadge({ fallbackId, location }: AdminLocationBadgeProps) {
    const country = location?.country;

    return (
        <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-accent/10 text-xs font-semibold text-accent">
                {country?.slice(0, 2).toUpperCase() || '--'}
            </div>
            <div className="min-w-0">
                <div className="truncate font-medium text-foreground">
                    {location?.name || (fallbackId ? `#${fallbackId}` : '--')}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                    {location?.slug || location?.country || ''}
                </div>
            </div>
        </div>
    );
}

/** Renders the shared copy/delete action menu for admin tables. */
export function AdminActionMenu({ label, copyLabel, copyValue, onDelete }: AdminActionMenuProps) {
    return (
        <div className="flex justify-end">
            <DropdownMenu>
                <DropdownMenuTrigger
                    render={
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="cursor-pointer"
                            aria-label={`Open actions for ${label}`}
                        />
                    }
                >
                    <MoreVertical className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => {
                            void navigator.clipboard.writeText(copyValue);
                            toast.success(`${copyLabel} copied`);
                        }}
                    >
                        Copy {copyLabel.toLowerCase()}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" variant="destructive" onClick={onDelete}>
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
