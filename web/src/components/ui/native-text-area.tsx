import { cn } from 'cn';
import { LoaderCircle } from 'lucide-react';
import { useId, type ComponentProps } from 'react';
import { Textarea } from '@/components/shadcn/textarea';
import { Field, FieldDescription, FieldLabel } from '@/components/shadcn/field';

/** Renders the shared textarea surface with trusted native-only editing options. */
export function NativeTextArea({
    label,
    description,
    loading,
    id: providedId,
    required,
    className,
    ...props
}: ComponentProps<typeof Textarea> & { label: string; description?: string; loading?: boolean }) {
    // Associate visible field text without including descriptions in the accessible name.
    const generatedId = useId();
    const id = providedId ?? generatedId;
    const descriptionId = `${id}-description`;
    const describedBy = [props['aria-describedby'], description && descriptionId].filter(Boolean).join(' ');

    // Keep native editing and submission semantics while announcing file loading.
    return (
        <Field data-disabled={props.disabled || undefined}>
            <FieldLabel htmlFor={id}>
                {label}
                {required && (
                    <span className="text-muted-foreground font-normal">
                        <span aria-hidden="true"> · </span>Required
                    </span>
                )}
            </FieldLabel>
            <div className="relative">
                <Textarea
                    {...props}
                    className={cn(loading && 'pe-8', className)}
                    id={id}
                    required={required}
                    aria-busy={loading || props['aria-busy']}
                    aria-describedby={describedBy || undefined}
                />
                {loading && (
                    <LoaderCircle
                        className="pointer-events-none absolute top-2 end-2 size-3.5 animate-spin text-muted-foreground motion-reduce:animate-none"
                        aria-hidden="true"
                    />
                )}
            </div>
            {description && <FieldDescription id={descriptionId}>{description}</FieldDescription>}
            <span role="status" className="sr-only">
                {loading ? 'Loading' : ''}
            </span>
        </Field>
    );
}
