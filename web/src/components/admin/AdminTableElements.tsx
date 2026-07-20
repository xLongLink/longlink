import { toast } from 'sonner';
import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** Renders the shared copy/delete action menu for admin tables. */
export function AdminActionMenu({
    label,
    copyLabel,
    copyValue,
    onDelete,
}: {
    label: string;
    copyLabel: string;
    copyValue: string;
    onDelete: () => void;
}) {
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
