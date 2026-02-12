import { Controller } from 'react-hook-form';
import * as z from 'zod';

import {
    type Component,
    type FieldDefinition,
    type FieldComponentProps,
} from '@/components/viavai/form.types';
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

export function textAreaValidation(config: Component) {
    let validator = z.string();

    if (config.required) {
        validator = validator.min(1, config.error || 'Required');
    }

    if (config.validate?.minLength !== undefined) {
        validator = validator.min(config.validate.minLength, config.error);
    }

    if (config.validate?.maxLength !== undefined) {
        validator = validator.max(config.validate.maxLength, config.error);
    }

    if (config.validate?.pattern) {
        validator = validator.regex(
            new RegExp(config.validate.pattern),
            config.error
        );
    }

    return validator;
}

export function TextArea({ config, control }: FieldComponentProps) {
    return (
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
    );
}

export const textareaField: FieldDefinition = {
    component: TextArea,
    validation: textAreaValidation,
};
