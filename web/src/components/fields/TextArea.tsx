import { Controller } from 'react-hook-form';

import { type FieldDefinition } from '@/components/viavai/form.types';
import {
    Field,
    FieldDescription,
    FieldError,
    FieldLabel,
} from '@/components/ui/field';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupText,
    InputGroupTextarea,
} from '@/components/ui/input-group';

import { buildStringValidation } from './validation';

export const textareaField: FieldDefinition = {
    buildValidation: buildStringValidation,

    render: ({ config, control }) => (
        <Controller
            name={config.name}
            control={control}
            render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={config.name}>
                        {config.label}
                    </FieldLabel>

                    <InputGroup>
                        <InputGroupTextarea
                            {...field}
                            id={config.name}
                            rows={6}
                            className="min-h-24 resize-none"
                            placeholder={config.placeholder}
                            aria-invalid={fieldState.invalid}
                        />
                        {config.validate?.maxLength && (
                            <InputGroupAddon align="block-end">
                                <InputGroupText className="tabular-nums">
                                    {String(field.value ?? '').length}/
                                    {config.validate.maxLength}
                                </InputGroupText>
                            </InputGroupAddon>
                        )}
                    </InputGroup>

                    {config.description && (
                        <FieldDescription>
                            {config.description}
                        </FieldDescription>
                    )}

                    {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                    )}
                </Field>
            )}
        />
    ),
};
