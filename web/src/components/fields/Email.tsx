import { Controller } from 'react-hook-form';

import { type FieldDefinition } from '@/components/viavai/form.types';
import {
    Field,
    FieldDescription,
    FieldError,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';

import { buildStringValidation } from './validation';

export const emailField: FieldDefinition = {
    buildValidation: (config) =>
        buildStringValidation(config).email(config.error || 'Invalid email'),

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
