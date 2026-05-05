import { Label } from '@/ui/label';
import { SelectContent, SelectItem, SelectTrigger, SelectValue, Select as UISelect } from '@/ui/select';
import type { XmlComponentProps } from '@/xml';

type SelectOption = {
    label: string;
    value: string;
};
type SelectProps = {
    name?: string;
    label?: string;
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    description?: string;
    options?: SelectOption[] | string;
    required?: boolean;
    disabled?: boolean;
};

function normalizeOptions(options: SelectProps['options']): SelectOption[] {
    if (Array.isArray(options)) return options;
    if (typeof options === 'string' && options.trim()) {
        try {
            const parsed = JSON.parse(options);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
}

/** Renders an XML select control from evaluated XML props. */
export function Select({ props }: XmlComponentProps) {
    const { name, label, value, onChange, placeholder, description, options, disabled } = props as SelectProps;
    const normalizedOptions = normalizeOptions(options);

    return (
        <div className="space-y-2">
            {label && <Label>{label}</Label>}
            <UISelect
                name={name}
                disabled={disabled}
                value={String(value ?? '')}
                onValueChange={(nextValue) => onChange?.(nextValue ?? '')}
            >
                <SelectTrigger className="w-full">
                    <SelectValue placeholder={placeholder ?? 'Select an option'} />
                </SelectTrigger>
                <SelectContent>
                    {normalizedOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </UISelect>
            {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
        </div>
    );
}
