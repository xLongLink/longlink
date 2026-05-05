import { Label } from '@/ui/label';
import { Switch as UISwitch } from '@/ui/switch';
import type { ComponentProps } from 'react';
import { useId } from 'react';

type SwitchProps = ComponentProps<typeof UISwitch> & {
    label?: string;
    description?: string;
    active?: boolean | string;
    checked?: boolean | string;
};

function toBoolean(value: boolean | string): boolean {
    return typeof value === 'string' ? value === 'true' : value;
}

export function Switch({ label, description, active = false, checked, ...props }: SwitchProps) {
    const id = useId();
    const resolvedChecked = toBoolean(checked ?? active);
    return (
        <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
            <div className="space-y-1">
                {label ? <Label htmlFor={id}>{label}</Label> : null}
                {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
            </div>
            <UISwitch id={id} checked={resolvedChecked} {...props} />
        </div>
    );
}

export default Switch;
