import { useMemo, useRef } from 'react';
import { useParams } from 'react-router';
import { Input as UIInput } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api';

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
    const { app } = useParams();
    const defaultFieldValue = useMemo(() => {
        if (typeof value === 'string' || typeof value === 'number') {
            return String(value);
        }

        return '';
    }, [value]);
    const previousValueRef = useRef(defaultFieldValue);

    const normalizedSubmitPath = (submit ?? '').replace(/^\/+|\/+$/g, '');

    const handleBlur = async (nextValue: string) => {
        if (
            !app ||
            !normalizedSubmitPath ||
            nextValue === previousValueRef.current
        ) {
            return;
        }

        previousValueRef.current = nextValue;

        await apiFetch(`/apps/${app}/${normalizedSubmitPath}`, {
            method: 'POST',
            body: {
                ...(name ? { name } : {}),
                value: nextValue,
            },
        });
    };

    const renderControl = () => {
        if (kind === 'textarea') {
            return (
                <Textarea
                    name={name}
                    placeholder={placeholder}
                    defaultValue={defaultFieldValue}
                    required={required}
                    disabled={disabled}
                    onBlur={(event) => {
                        void handleBlur(event.currentTarget.value);
                    }}
                />
            );
        }

        const type = kind === 'datetime' ? 'datetime-local' : kind;

        return (
            <UIInput
                name={name}
                type={type}
                placeholder={placeholder}
                defaultValue={defaultFieldValue}
                required={required}
                disabled={disabled}
                onBlur={(event) => {
                    void handleBlur(event.currentTarget.value);
                }}
            />
        );
    };

    return (
        <div className="space-y-2">
            {label && <Label>{label}</Label>}

            {renderControl()}

            {description ? (
                <p className="text-muted-foreground text-sm">{description}</p>
            ) : null}
        </div>
    );
}

export default Input;
