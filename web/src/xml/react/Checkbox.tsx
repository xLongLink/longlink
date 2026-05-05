import { Checkbox as UICheckbox } from '@/ui/checkbox';
import { Label } from '@/ui/label';
import type { ComponentProps } from 'react';
import { useId } from 'react';

type CheckboxProps = ComponentProps<typeof UICheckbox> & {
    label?: string;
    description?: string;
    checked?: boolean | string;
};

function toBoolean(value: boolean | string): boolean {
    return typeof value === 'string' ? value === 'true' : value;
}

export function Checkbox({ label, description, checked = false, ...props }: CheckboxProps) {
    const id = useId();
    const resolvedChecked = toBoolean(checked);
    return (
        <div className="flex items-start space-x-3 rounded-md border p-4">
            <UICheckbox id={id} checked={resolvedChecked} {...props} />
            <div className="space-y-1 leading-none">
                {label ? <Label htmlFor={id}>{label}</Label> : null}
                {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
            </div>
        </div>
    );
}

export default Checkbox;
