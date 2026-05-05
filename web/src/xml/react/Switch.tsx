import { Label } from '@/ui/label';
import { Switch as UISwitch } from '@/ui/switch';
import type { XmlComponentProps } from '@/xml';
import { useProps } from '@/xml';
import { useId } from 'react';

type SwitchProps = {
    label?: string;
    description?: string;
    checked?: boolean | string;
    onChange?: (checked: boolean) => void;
};

/** Renders an XML switch control from evaluated XML props. */
export function Switch({ props: rawProps }: XmlComponentProps) {
    const props = useProps(rawProps as Record<string, string>);
    const { label, description, checked = false, onChange } = props as SwitchProps;
    const id = useId();
    const rawChecked = checked;
    const resolvedChecked = typeof rawChecked === 'string' ? rawChecked === 'true' : rawChecked;
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
