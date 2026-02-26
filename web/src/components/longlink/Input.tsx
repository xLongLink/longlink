import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Input as UIInput } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type InputProps = {
    name?: string;
    kind?: 'text' | 'number' | 'password' | 'textarea' | 'date' | 'datetime';
    label?: string;
    value?: string | number | boolean;
    placeholder?: string;
    description?: string;
    required?: boolean;
    disabled?: boolean;
    submit?: string;
};

export function Input({
    name,
    kind = 'text',
    label,
    value,
    placeholder,
    description,
    required,
    disabled,
    submit,
}: InputProps) {
    const renderControl = () => {
        if (kind === 'textarea') {
            return (
                <Textarea
                    name={name}
                    placeholder={placeholder}
                    defaultValue={typeof value === 'string' ? value : undefined}
                    required={required}
                    disabled={disabled}
                />
            );
        }

        const type = kind === 'datetime' ? 'datetime-local' : kind;

        return (
            <UIInput
                name={name}
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
