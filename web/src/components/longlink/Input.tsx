import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Input as UIInput } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

type InputOption = {
    label: string;
    value: string;
};

type InputProps = {
    name?: string;
    kind?:
        | 'text'
        | 'number'
        | 'password'
        | 'textarea'
        | 'date'
        | 'datetime'
        | 'select'
        | 'switch';
    label?: string;
    value?: string | number | boolean;
    placeholder?: string;
    description?: string;
    options?: InputOption[];
    required?: boolean;
    disabled?: boolean;
    submit?: string;
};

export function Input({
    kind = 'text',
    label,
    value,
    placeholder,
    description,
    options,
    required,
    disabled,
    submit,
}: InputProps) {
    const renderControl = () => {
        if (kind === 'textarea') {
            return (
                <Textarea
                    placeholder={placeholder}
                    defaultValue={typeof value === 'string' ? value : undefined}
                    required={required}
                    disabled={disabled}
                />
            );
        }

        if (kind === 'switch') {
            return (
                <Switch defaultChecked={Boolean(value)} disabled={disabled} />
            );
        }

        if (kind === 'select') {
            return (
                <Select disabled={disabled} defaultValue={String(value ?? '')}>
                    <SelectTrigger className="w-full">
                        <SelectValue
                            placeholder={placeholder ?? 'Select an option'}
                        />
                    </SelectTrigger>
                    <SelectContent>
                        {(options ?? []).map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            );
        }

        const type = kind === 'datetime' ? 'datetime-local' : kind;

        return (
            <UIInput
                type={type}
                placeholder={placeholder}
                defaultValue={
                    typeof value === 'string' || typeof value === 'number'
                        ? value
                        : undefined
                }
                required={required}
                disabled={disabled}
            />
        );
    };

    return (
        <div className="space-y-2">
            {label && <Label>{label}</Label>}

            {submit ? (
                <ButtonGroup className="w-full">
                    {renderControl()}
                    <Button
                        type="button"
                        className="cursor-pointer"
                        disabled={disabled}
                    >
                        {submit}
                    </Button>
                </ButtonGroup>
            ) : (
                renderControl()
            )}

            {description ? (
                <p className="text-muted-foreground text-sm">{description}</p>
            ) : null}
        </div>
    );
}

export default Input;
