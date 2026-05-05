import { Button } from '@/ui/button';
import { ButtonGroup } from '@/ui/button-group';
import { Label } from '@/ui/label';
import { SelectContent, SelectItem, SelectTrigger, SelectValue, Select as UISelect } from '@/ui/select';

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
    submit?: string;
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

export function Select({
    name,
    label,
    value,
    onChange,
    placeholder,
    description,
    options,
    disabled,
    submit,
}: SelectProps) {
    const normalizedOptions = normalizeOptions(options);
    const renderControl = () => (
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
    );
    return (
        <div className="space-y-2">
            {label && <Label>{label}</Label>}
            {submit ? (
                <ButtonGroup className="w-full">
                    {renderControl()}
                    <Button disabled={disabled}>{submit}</Button>
                </ButtonGroup>
            ) : (
                renderControl()
            )}
            {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
        </div>
    );
}
