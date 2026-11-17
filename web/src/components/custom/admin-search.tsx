import { useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Field, FieldLabel } from '@/components/shadcn/field';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/shadcn/input-group';

/** Keeps admin search controlled while owning clear-button focus restoration. */
export function AdminSearch({
    id,
    label,
    placeholder,
    value,
    onChange
}: {
    id: string;
    label: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
}) {
    const input = useRef<HTMLInputElement>(null);

    return (
        <Field>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <InputGroup>
                <InputGroupInput
                    ref={input}
                    id={id}
                    placeholder={placeholder}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                />
                <InputGroupAddon aria-hidden="true">
                    <Search />
                </InputGroupAddon>
                {value !== '' && (
                    <InputGroupAddon align="inline-end">
                        <InputGroupButton
                            size="icon-xs"
                            aria-label={`Clear ${label}`}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                                onChange('');
                                input.current?.focus({ preventScroll: true });
                            }}
                        >
                            <X aria-hidden="true" />
                        </InputGroupButton>
                    </InputGroupAddon>
                )}
            </InputGroup>
        </Field>
    );
}
