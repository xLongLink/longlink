import { useId } from 'react';
import { Checkbox as UICheckbox } from '@/ui/checkbox';
import { Label } from '@/ui/label';

type CheckboxProps = {
    label?: string;
    description?: string;
    checked?: boolean;
};

export function Checkbox({ label, description, checked = false }: CheckboxProps) {
    const id = useId();

    return (
        <div className="flex items-start space-x-3 rounded-md border p-4">
            <UICheckbox id={id} defaultChecked={checked} />
            <div className="space-y-1 leading-none">
                {label ? <Label htmlFor={id}>{label}</Label> : null}
                {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
            </div>
        </div>
    );
}

export default Checkbox;
