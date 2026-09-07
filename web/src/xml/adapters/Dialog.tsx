import { z } from 'zod';
import type { Props } from '../types';
import { createContext } from 'react';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { Button } from '@astryxdesign/core/Button';
import { Dialog as AstryxDialog } from '@/components/ui/Dialog';
import { coerceXmlBoolean, useBindableValue } from '../core/binding';
import { resolveXmlProps, xmlNonblankStringSchema, xmlSpacingSchema } from '../core/props';

const dialogPropsSchema = z.object({
    gap: xmlSpacingSchema.default(3),
    purpose: z.enum(['required', 'form', 'info']).optional(),
    subtitle: z.string().optional(),
    title: xmlNonblankStringSchema,
    triggerLabel: xmlNonblankStringSchema.optional(),
});

export const DialogCloseContext = createContext<(() => void) | null>(null);

export function Dialog({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'isOpen', ctx, coerceXmlBoolean);
    const { gap, purpose, subtitle, title, triggerLabel } = resolveXmlProps(props, ctx, dialogPropsSchema, [
        'title',
        'triggerLabel',
    ]);

    if (props.triggerLabel != null && triggerLabel == null) {
        throw new Error('Dialog requires a string triggerLabel');
    }

    return (
        <DialogCloseContext.Provider value={() => binding.setValue(false)}>
            {triggerLabel && <Button clickAction={() => binding.setValue(true)} label={triggerLabel} />}
            <AstryxDialog
                gap={gap}
                isOpen={binding.value}
                purpose={purpose}
                subtitle={subtitle}
                title={title}
                onOpenChange={binding.setValue}
            >
                {renderNode(nodes, ctx)}
            </AstryxDialog>
        </DialogCloseContext.Provider>
    );
}
