import { z } from 'zod';
import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { resolveXmlProps } from '../core/props';
import { CodeBlock as AstryxCodeBlock } from '@astryxdesign/core/CodeBlock';

const codeBlockPropsSchema = z.object({
    hasLineNumbers: z.boolean().optional(),
    value: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .default(''),
});

/** Renders text or JSON log lines in a readable code block. */
export function CodeBlock({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const { hasLineNumbers, value } = resolveXmlProps(props, ctx, codeBlockPropsSchema, ['value']);

    return <AstryxCodeBlock code={Array.isArray(value) ? value.join('\n') : value} hasLineNumbers={hasLineNumbers} isWrapped size="sm" />;
}
