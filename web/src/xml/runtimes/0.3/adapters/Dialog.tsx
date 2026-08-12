import { Button } from '@astryxdesign/core-0-3/Button';
import { Dialog as AstryxDialog, DialogHeader } from '@astryxdesign/core-0-3/Dialog';
import { Layout, LayoutContent } from '@astryxdesign/core-0-3/Layout';
import { Stack } from '@astryxdesign/core-0-3/Stack';
import { createContext } from 'react';
import { toXmlBoolean, useBindableValue } from '../core/binding';
import { useXmlRuntime } from '../core/context';
import { renderNode } from '../core/node';
import { isXmlEnum, isXmlNumber, isXmlString, requireXmlString, resolveXml } from '../core/props';
import type { Props } from '../types';

export const DialogCloseContext = createContext<(() => void) | null>(null);

/** Renders a controlled Astryx dialog with an optional adapter-owned trigger. */
export function Dialog({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'isOpen', ctx, toXmlBoolean);
    const title = requireXmlString(props, 'title', ctx, 'Dialog');
    const triggerLabel =
        props.triggerLabel == null ? undefined : requireXmlString(props, 'triggerLabel', ctx, 'Dialog');
    const purposeValue = resolveXml(props, 'purpose', ctx);
    const variantValue = resolveXml(props, 'variant', ctx);
    const purpose = isXmlEnum(purposeValue, ['required', 'form', 'info']) ? purposeValue : 'info';
    const variant = isXmlEnum(variantValue, ['standard', 'fullscreen']) ? variantValue : 'standard';
    const maxHeight = resolveXml(props, 'maxHeight', ctx);
    const padding = resolveXml(props, 'padding', ctx);
    const width = resolveXml(props, 'width', ctx);
    const subtitle = resolveXml(props, 'subtitle', ctx);

    return (
        <>
            {triggerLabel && <Button clickAction={() => binding.setValue(true)} label={triggerLabel} />}
            <DialogCloseContext.Provider value={() => binding.setValue(false)}>
                <AstryxDialog
                    isOpen={binding.value}
                    maxHeight={isXmlString(maxHeight) || isXmlNumber(maxHeight) ? maxHeight : undefined}
                    onOpenChange={binding.setValue}
                    padding={isXmlEnum(padding, [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10]) ? padding : undefined}
                    purpose={purpose}
                    variant={variant}
                    width={isXmlString(width) || isXmlNumber(width) ? width : undefined}
                >
                    <Layout
                        header={
                            <DialogHeader
                                onOpenChange={purpose === 'required' ? undefined : binding.setValue}
                                subtitle={isXmlString(subtitle) ? subtitle : undefined}
                                title={title}
                            />
                        }
                        content={
                            <LayoutContent>
                                <Stack gap={4}>{renderNode(nodes, ctx)}</Stack>
                            </LayoutContent>
                        }
                    />
                </AstryxDialog>
            </DialogCloseContext.Provider>
        </>
    );
}
