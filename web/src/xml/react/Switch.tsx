import { Label } from '@/ui/label';
import { Switch as UISwitch } from '@/ui/switch';
import { useId } from 'react';

type SwitchProps = {
    label?: string;
    description?: string;
    active?: boolean;
    checked?: boolean;
    onChange?: (checked: boolean) => void;
};

export function Switch({ label, description, active = false, checked, onChange }: SwitchProps) {
    const id = useId();
    const resolvedChecked =
        typeof (checked ?? active) === 'string' ? (checked ?? active) === 'true' : (checked ?? active);
    return (
        <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
            <div className="space-y-1">
                {label ? <Label htmlFor={id}>{label}</Label> : null}
                {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
            </div>
            <UISwitch id={id} checked={resolvedChecked} onCheckedChange={onChange} />
        </div>
    );
}
