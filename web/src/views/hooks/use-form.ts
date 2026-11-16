import type { z } from 'zod';
import * as forms from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { FieldValues, UseFormProps, UseFormReturn } from 'react-hook-form';

/** Uses the supplied schema for validation while preserving React Hook Form input and output types. */
export function useForm<Input extends FieldValues, Context = unknown, Output extends FieldValues = Input>(
    schema: z.ZodType<Output, Input>,
    options?: Omit<UseFormProps<Input, Context, Output>, 'resolver'>
): UseFormReturn<Input, Context, Output> {
    return forms.useForm<Input, Context, Output>({ ...options, resolver: zodResolver(schema) });
}
