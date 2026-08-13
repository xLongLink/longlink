import { createContext } from 'react';
import { Stack } from '@astryxdesign/core-0-3/Stack';
import { Button } from '@astryxdesign/core-0-3/Button';
import { Layout, LayoutContent } from '@astryxdesign/core-0-3/Layout';
import { Dialog as AstryxDialog, DialogHeader } from '@astryxdesign/core-0-3/Dialog';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { isXmlEnum, requireXmlString, resolveXml } from '../core/props';
import { toXmlBoolean, useBindableValue } from '../core/binding';
import { SPACINGS } from '../constants';

export const DialogCloseContext = createContext<(() => void) | null>(null);

/**
 * checked: false
 * https://astryx.atmeta.com/components/Dialog?tab=properties
 * - title: string
 * - subtitle: string
 * - triggerLabel: string
 * - isOpen: bool
 * - purpose: str
 * - variant: str
 * - maxHeight: str | int
 * - padding: int | float
 * - width: str | int
 * - children: ReactNode
 */
export function Dialog({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'isOpen', ctx, toXmlBoolean);
    const title = requireXmlString(props, 'title', ctx, 'Dialog');
    const triggerLabel =
        props.triggerLabel == null ? undefined : requireXmlString(props, 'triggerLabel', ctx, 'Dialog');
    const purposeValue = resolveXml(props, 'purpose', ctx);
    const variantValue = resolveXml(props, 'variant', ctx);
    const purpose =
        purposeValue === 'required' || purposeValue === 'form' || purposeValue === 'info' ? purposeValue : 'info';
    const variant = variantValue === 'standard' || variantValue === 'fullscreen' ? variantValue : 'standard';
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
                    maxHeight={typeof maxHeight === 'string' || typeof maxHeight === 'number' ? maxHeight : undefined}
                    onOpenChange={binding.setValue}
                    padding={isXmlEnum(padding, SPACINGS) ? padding : undefined}
                    purpose={purpose}
                    variant={variant}
                    width={typeof width === 'string' || typeof width === 'number' ? width : undefined}
                >
                    <Layout
                        header={
                            <DialogHeader
                                onOpenChange={purpose === 'required' ? undefined : binding.setValue}
                                subtitle={typeof subtitle === 'string' ? subtitle : undefined}
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
