import { type ReactElement } from 'react';
import { type Control, type FieldValues } from 'react-hook-form';
import * as z from 'zod';

export type Component = {
    type: 'text' | 'email' | 'textarea';
    name: string;
    label: string;
    description?: string;
    placeholder?: string;
    required?: boolean;
    default?: string;
    validate?: {
        pattern?: string;
        minLength?: number;
        maxLength?: number;
    };
    error?: string;
    depends?: unknown[];
};

export type FieldComponentProps = {
    config: Component;
    control: Control<FieldValues>;
};

export type FieldDefinition = {
    component: (props: FieldComponentProps) => ReactElement;
    validation: (config: Component) => z.ZodTypeAny;
};
