
const textareaField: FieldDefinition = {
    buildValidation: (config) => {
        let validator = z.string()

        if (config.required) {
            validator = validator.min(1, config.error || "Required")
        }

        if (config.validate?.minLength !== undefined) {
            validator = validator.min(config.validate.minLength, config.error)
        }

        if (config.validate?.maxLength !== undefined) {
            validator = validator.max(config.validate.maxLength, config.error)
        }

        if (config.validate?.pattern) {
            validator = validator.regex(
                new RegExp(config.validate.pattern),
                config.error
            )
        }

        return validator
    },

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
                                    {field.value.length}/
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
}