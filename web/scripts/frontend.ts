import type { JSX } from 'react';
import type { z } from 'zod';
import type { FieldValues, Resolver } from 'react-hook-form';

export * from '../src/components/longlink';
export { z } from 'zod';
export { useForm } from '../src/views/hooks/use-form';
export { useFormContext } from '../src/views/hooks/use-form-context';
export { useSubmit } from '../src/views/hooks/use-submit';
export { useTable } from '../src/views/hooks/use-table';
export type { ColumnDef, CellContext, RowSelectionState, SortingState } from '../src/views/hooks/use-table';
export type FrontendElement = JSX.Element;
export type FrontendElementType = JSX.ElementType;

// Keep the SDK's Zod 4 resolver declarations independent of the library's legacy Zod 3 fallback types.
export declare function zodResolver<Input extends FieldValues, Context, Output extends FieldValues>(
    schema: z.ZodType<Output, Input>,
    schemaOptions?: z.core.ParseContext<z.core.$ZodIssue>,
    resolverOptions?: { mode?: 'async' | 'sync'; raw?: false }
): Resolver<Input, Context, Output>;
export declare function zodResolver<Input extends FieldValues, Context, Output extends FieldValues>(
    schema: z.ZodType<Output, Input>,
    schemaOptions: z.core.ParseContext<z.core.$ZodIssue> | undefined,
    resolverOptions: { mode?: 'async' | 'sync'; raw: true }
): Resolver<Input, Context, Input>;
