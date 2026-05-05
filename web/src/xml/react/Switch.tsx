import { Label } from '@/ui/label';
import { Switch as UISwitch } from '@/ui/switch';
import type { XmlComponentProps } from '@/xml';
import { evaluate, resolveBinding, useContext } from '@/xml';
import { useId } from 'react';

type SwitchProps = {
    label?: string;
    description?: string;
    checked?: boolean | string;
    onChange?: (checked: boolean) => void;
};

/** Renders an XML switch control from evaluated XML props. */
export function Switch({ props: rawProps }: XmlComponentProps) {
    const { ctx, setters } = useContext();
    const label = String(evaluate(rawProps.label ?? '', ctx) ?? '');
    const description = String(evaluate(rawProps.description ?? '', ctx) ?? '');

    /* Resolve checked binding for two-way data sync */
    const checkedProp = rawProps.checked ?? '';
    let checked: unknown = evaluate(checkedProp, ctx);
    let onChange: ((checked: boolean) => void) | undefined;
    if (checkedProp.startsWith('$')) {
        try {
            const binding = resolveBinding(checkedProp.slice(1), ctx, setters ?? {});
            checked = binding.value;
            onChange = binding.setValue as (checked: boolean) => void;
        } catch {
            // Use evaluated value if binding fails
        }
    }

    const id = useId();
    const resolvedChecked = typeof checked === 'string' ? checked === 'true' : Boolean(checked);
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
