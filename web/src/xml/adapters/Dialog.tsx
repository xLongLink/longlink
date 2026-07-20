import { useState } from 'react';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Dialog as AstryxDialog, DialogHeader } from '@astryxdesign/core/Dialog';
import type { Props } from '@/xml/types';
import { renderNode } from '@/xml/core/node';
import { useXmlContext } from '@/xml/core/context';
import { toXmlBoolean, useBindableValue } from './binding';
import {
    requireXmlString,
    resolveXmlEnum,
    resolveXmlLabel,
    resolveXmlSizeValue,
    resolveXmlSpacing,
    resolveXmlString,
} from './props';

/** Renders a controlled Astryx dialog with an optional adapter-owned trigger. */
export function Dialog({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const binding = useBindableValue(props, 'isOpen', ctx);
    const [localOpen, setLocalOpen] = useState(toXmlBoolean(binding.initialValue));
    const isOpen = binding.bound ? toXmlBoolean(binding.currentValue) : localOpen;
    const title = resolveXmlLabel(props, ctx, 'Dialog', 'title');
    const subtitle = resolveXmlString(props, 'subtitle', ctx);
    const triggerLabel = props.triggerLabel == null ? '' : requireXmlString(props, 'triggerLabel', ctx, 'Dialog');
    const triggerVariant = resolveXmlEnum(
        props,
        'triggerVariant',
        ctx,
        ['primary', 'secondary', 'ghost', 'destructive'],
        'secondary',
        'Dialog'
    );
    const triggerSize = resolveXmlEnum(props, 'triggerSize', ctx, ['sm', 'md', 'lg'], 'md', 'Dialog');
    const purpose = resolveXmlEnum(props, 'purpose', ctx, ['required', 'form', 'info'], 'info', 'Dialog');
    const variant = resolveXmlEnum(props, 'variant', ctx, ['standard', 'fullscreen'], 'standard', 'Dialog');

    /** Writes open-state changes to bound or local state. */
    function setOpen(nextOpen: boolean) {
        if (binding.bound) binding.setValue(nextOpen);
        else setLocalOpen(nextOpen);
    }

    return (
        <>
            {triggerLabel && (
                <Button
                    clickAction={() => setOpen(true)}
                    label={triggerLabel}
                    size={triggerSize}
                    variant={triggerVariant}
                />
            )}
            <AstryxDialog
                isOpen={isOpen}
                maxHeight={resolveXmlSizeValue(props, 'maxHeight', ctx)}
                onOpenChange={setOpen}
                padding={resolveXmlSpacing(props, 'padding', ctx)}
                purpose={purpose}
                variant={variant}
                width={resolveXmlSizeValue(props, 'width', ctx)}
            >
                <Stack gap={4}>
                    <DialogHeader
                        onOpenChange={purpose === 'required' ? undefined : setOpen}
                        subtitle={subtitle || undefined}
                        title={title}
                    />
                    {renderNode(nodes, ctx)}
                </Stack>
            </AstryxDialog>
        </>
    );
}
