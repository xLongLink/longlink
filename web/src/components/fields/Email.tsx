import { Controller } from 'react-hook-form';
import * as z from 'zod';

import {
    type Component,
    type FieldDefinition,
} from '@/components/viavai/form.types';
import {
    Field,
    FieldDescription,
    FieldError,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';

function buildEmailValidation(config: Component) {
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

    return validator.email(config.error || 'Invalid email');
}

export const emailField: FieldDefinition = {
    buildValidation: buildEmailValidation,

    render: ({ config, control }) => (
        <Controller
            name={config.name}
            control={control}
            render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={config.name}>
                        {config.label}
                    </FieldLabel>

                    <Input
                        {...field}
                        id={config.name}
                        type="email"
                        placeholder={config.placeholder}
                        aria-invalid={fieldState.invalid}
                    />

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
