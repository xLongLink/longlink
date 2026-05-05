import { Checkbox as UICheckbox } from '@/ui/checkbox';
import { Label } from '@/ui/label';
import type { XmlComponentProps } from '@/xml';
import { useProps } from '@/xml';
import { useId } from 'react';

type CheckboxProps = {
    label?: string;
    description?: string;
    checked?: boolean | string;
    onChange?: (checked: boolean) => void;
};

/** Renders an XML checkbox control from evaluated XML props. */
export function Checkbox({ props: rawProps }: XmlComponentProps) {
    const props = useProps(rawProps as Record<string, string>);
    const { label, description, checked = false, onChange } = props as CheckboxProps;
    const id = useId();
    const resolvedChecked = typeof checked === 'string' ? checked === 'true' : checked;
    return (
        <div className="flex items-start space-x-3 rounded-md border p-4">
            <UICheckbox id={id} checked={resolvedChecked} onCheckedChange={onChange} />
            <div className="space-y-1 leading-none">
                {label ? <Label htmlFor={id}>{label}</Label> : null}
                {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
            </div>
        </div>
    );
}
