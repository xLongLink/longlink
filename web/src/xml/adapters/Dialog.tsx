import { z } from 'zod';
import { X } from 'lucide-react';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { Text } from '@astryxdesign/core/Text';
import { useXmlRuntime } from '../core/context';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Dialog as AstryxDialog } from '@astryxdesign/core/Dialog';
import { coerceXmlBoolean, useBindableValue } from '../core/binding';
import { resolveXmlProps, xmlNonblankStringSchema, xmlSpacingSchema } from '../core/props';

const dialogPropsSchema = z.object({
    fullscreen: z.boolean().default(false),
    gap: xmlSpacingSchema.default(3),
    height: z.union([z.string(), z.number()]).optional(),
    width: z.union([z.string(), z.number()]).optional(),
    purpose: z.enum(['required', 'form', 'info']).optional(),
    subtitle: z.string().optional(),
    title: xmlNonblankStringSchema,
    triggerLabel: xmlNonblankStringSchema.optional(),
});

/** Renders a bound XML dialog with its titled header and structured content. */
export function Dialog({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'isOpen', ctx, coerceXmlBoolean);
    const { fullscreen, gap, height, purpose, subtitle, title, triggerLabel, width } = resolveXmlProps(
        props,
        ctx,
        dialogPropsSchema,
        ['title', 'triggerLabel']
    );

    if (props.triggerLabel != null && triggerLabel == null) {
        throw new Error('Dialog requires a string triggerLabel');
    }

    return (
        <>
            {triggerLabel && <Button clickAction={() => binding.setValue(true)} label={triggerLabel} />}
            <AstryxDialog
                aria-label={title}
                isOpen={binding.value}
                maxHeight={height}
                padding={0}
                purpose={purpose}
                variant={fullscreen ? 'fullscreen' : undefined}
                width={width ?? 640}
                onOpenChange={binding.setValue}
            >
                <Stack gap={0}>
                    <Stack
                        direction="horizontal"
                        gap={2}
                        justify="between"
                        align="start"
                        paddingBlock={2}
                        paddingInline={4}
                    >
                        <Stack gap={subtitle ? 1 : 0}>
                            <Heading level={2}>{title}</Heading>
                            {subtitle ? (
                                <Text color="secondary" size="sm" type="body">
                                    {subtitle}
                                </Text>
                            ) : null}
                        </Stack>
                        {purpose === 'required' ? null : (
                            <IconButton
                                icon={<X />}
                                label="Close dialog"
                                tooltip="Close"
                                variant="ghost"
                                onClick={() => binding.setValue(false)}
                            />
                        )}
                    </Stack>
                    <Divider />
                    <Stack gap={gap} padding={4}>
                        {renderNode(nodes, ctx)}
                    </Stack>
                </Stack>
            </AstryxDialog>
        </>
    );
}
