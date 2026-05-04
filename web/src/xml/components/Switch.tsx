import { useId } from 'react';
import { Label } from '@/ui/label';
import { Switch as UISwitch } from '@/ui/switch';
import type { ComponentProps } from 'react';

type SwitchProps = ComponentProps<typeof UISwitch> & {
    label?: string;
    description?: string;
    active?: boolean | string;
    checked?: boolean | string;
};

/** Coerces XML boolean strings before passing them to the UI switch. */
function toBoolean(value: boolean | string): boolean {
    return typeof value === 'string' ? value === 'true' : value;
}

/** Renders a toggle switch with label and description. */
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
