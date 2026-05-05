import { Label } from '@/ui/label';
import { Textarea as UITextarea } from '@/ui/textarea';
import type { XmlComponentProps } from '@/xml';
import { evaluate, resolveBinding, useContext } from '@/xml';

type TextareaProps = {
    label?: string;
    description?: string;
    name?: string;
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
};

/** Renders an XML textarea control from evaluated XML props. */
export function Textarea({ props: rawProps }: XmlComponentProps) {
    const { ctx, setters } = useContext();
    const label = String(evaluate(rawProps.label ?? '', ctx) ?? '');
    const description = String(evaluate(rawProps.description ?? '', ctx) ?? '');
    const name = String(evaluate(rawProps.name ?? '', ctx) ?? '');
    const placeholder = String(evaluate(rawProps.placeholder ?? '', ctx) ?? '');
    const required = Boolean(evaluate(rawProps.required ?? '', ctx) ?? false);
    const disabled = Boolean(evaluate(rawProps.disabled ?? '', ctx) ?? false);

    /* Resolve value binding for two-way data sync */
    const valueProp = rawProps.value ?? '';
    let value: unknown = evaluate(valueProp, ctx);
    let onChange: ((value: string) => void) | undefined;
    if (valueProp.startsWith('$')) {
        try {
            const binding = resolveBinding(valueProp.slice(1), ctx, setters ?? {});
            value = binding.value;
            onChange = binding.setValue as (value: string) => void;
        } catch {
            // Use evaluated value if binding fails
        }
    }

    return (
        <div className="space-y-2">
            {label ? <Label>{label}</Label> : null}
            <UITextarea
                name={name}
                value={String(value ?? '')}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                onChange={(event) => {
                    onChange?.(event.currentTarget.value);
                }}
            />
            {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
        </div>
    );
}
