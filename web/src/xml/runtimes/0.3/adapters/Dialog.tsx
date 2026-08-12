import { Button } from '@astryxdesign/core-0-3/Button';
import { Dialog as AstryxDialog, DialogHeader } from '@astryxdesign/core-0-3/Dialog';
import { Layout, LayoutContent } from '@astryxdesign/core-0-3/Layout';
import { Stack } from '@astryxdesign/core-0-3/Stack';
import { createContext } from 'react';
import { toXmlBoolean, useBindableValue } from '../core/binding';
import { useXmlRuntime } from '../core/context';
import { renderNode } from '../core/node';
import {
    requireXmlString,
    resolveXmlEnum,
    resolveXmlSizeValue,
    resolveXmlSpacing,
    resolveXmlString,
} from '../core/props';
import type { Props } from '../types';

export const DialogCloseContext = createContext<(() => void) | null>(null);

/** Renders a controlled Astryx dialog with an optional adapter-owned trigger. */
export function Dialog({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'isOpen', ctx, toXmlBoolean);
    const title = requireXmlString(props, 'title', ctx, 'Dialog');
    const triggerLabel =
        props.triggerLabel == null ? undefined : requireXmlString(props, 'triggerLabel', ctx, 'Dialog');
    const purpose = resolveXmlEnum(props, 'purpose', ctx, ['required', 'form', 'info'], 'info', 'Dialog');
    const variant = resolveXmlEnum(props, 'variant', ctx, ['standard', 'fullscreen'], 'standard', 'Dialog');

    return (
        <>
            {triggerLabel && <Button clickAction={() => binding.setValue(true)} label={triggerLabel} />}
            <DialogCloseContext.Provider value={() => binding.setValue(false)}>
                <AstryxDialog
                    isOpen={binding.value}
                    maxHeight={resolveXmlSizeValue(props, 'maxHeight', ctx)}
                    onOpenChange={binding.setValue}
                    padding={resolveXmlSpacing(props, 'padding', ctx)}
                    purpose={purpose}
                    variant={variant}
                    width={resolveXmlSizeValue(props, 'width', ctx)}
                >
                    <Layout
                        header={
                            <DialogHeader
                                onOpenChange={purpose === 'required' ? undefined : binding.setValue}
                                subtitle={resolveXmlString(props, 'subtitle', ctx) || undefined}
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
