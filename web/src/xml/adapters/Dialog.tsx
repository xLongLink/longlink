import { z } from 'zod';
import type { Props } from '../types';
import { createContext } from 'react';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { Stack } from '@astryxdesign/core/Stack';
import { useBindableValue } from '../core/binding';
import { Button } from '@astryxdesign/core/Button';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { Dialog as AstryxDialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { resolveXmlProps, xmlNonblankStringSchema, xmlSpacingWithDefaultSchema } from '../core/props';

const dialogPropsSchema = z.object({
    gap: xmlSpacingWithDefaultSchema,
    purpose: z.enum(['required', 'form', 'info']).optional().catch('info').default('info'),
    subtitle: z.string().optional().catch(undefined),
    title: xmlNonblankStringSchema,
    triggerLabel: xmlNonblankStringSchema.optional(),
});

export const DialogCloseContext = createContext<(() => void) | null>(null);

export function Dialog({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'isOpen', ctx, (value) => value !== 'false' && Boolean(value));
    const { gap, purpose, subtitle, title, triggerLabel } = resolveXmlProps(
        props,
        ctx,
        { gap: 'scalar', purpose: 'scalar', subtitle: 'scalar', title: 'raw', triggerLabel: 'raw' },
        dialogPropsSchema
    );

    if (props.triggerLabel != null && triggerLabel == null) {
        throw new Error('Dialog requires a string triggerLabel');
    }

    return (
        <>
            {triggerLabel && <Button clickAction={() => binding.setValue(true)} label={triggerLabel} />}
            <DialogCloseContext.Provider value={() => binding.setValue(false)}>
                <AstryxDialog isOpen={binding.value} onOpenChange={binding.setValue} purpose={purpose}>
                    <Layout
                        header={
                            <DialogHeader
                                onOpenChange={purpose === 'required' ? undefined : binding.setValue}
                                subtitle={subtitle}
                                title={title}
                            />
                        }
                        content={
                            <LayoutContent>
                                <Stack gap={gap}>{renderNode(nodes, ctx)}</Stack>
                            </LayoutContent>
                        }
                    />
                </AstryxDialog>
            </DialogCloseContext.Provider>
        </>
    );
}
