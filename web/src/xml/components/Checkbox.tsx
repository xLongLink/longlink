import { useId } from 'react';
import { Checkbox as UICheckbox } from '@/ui/checkbox';
import { Label } from '@/ui/label';
import type { ComponentProps } from 'react';

type CheckboxProps = ComponentProps<typeof UICheckbox> & {
    label?: string;
    description?: string;
    checked?: boolean;
};

/** Renders a checkbox with label and description. */
export function Checkbox({ label, description, checked = false, ...props }: CheckboxProps) {
    const id = useId();

    return (
        <div className="flex items-start space-x-3 rounded-md border p-4">
            <UICheckbox id={id} defaultChecked={checked} {...props} />
            <div className="space-y-1 leading-none">
                {label ? <Label htmlFor={id}>{label}</Label> : null}
                {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
            </div>
        </div>
    );
}

export default Checkbox;
