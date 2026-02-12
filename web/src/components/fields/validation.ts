import * as z from 'zod';

import { type Component } from '@/components/viavai/form.types';

export function buildStringValidation(config: Component) {
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
