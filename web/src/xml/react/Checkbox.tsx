import { Checkbox as UICheckbox } from '@/ui/checkbox';
import { Label } from '@/ui/label';
import type { XmlComponentProps } from '@/xml';
import { evaluate, resolveBinding, useContext } from '@/xml';
import { useId } from 'react';

type CheckboxProps = {
    label?: string;
    description?: string;
    checked?: boolean | string;
    onChange?: (checked: boolean) => void;
};

/** Renders an XML checkbox control from evaluated XML props. */
export function Checkbox({ props: rawProps }: XmlComponentProps) {
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
        <div className="flex items-start space-x-3 rounded-md border p-4">
            <UICheckbox id={id} checked={resolvedChecked} onCheckedChange={onChange} />
            <div className="space-y-1 leading-none">
                {label ? <Label htmlFor={id}>{label}</Label> : null}
                {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
            </div>
        </div>
    );
}
