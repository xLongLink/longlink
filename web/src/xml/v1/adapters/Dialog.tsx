import { Button } from '@astryxdesign/core/Button';
import { Dialog as AstryxDialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { Stack } from '@astryxdesign/core/Stack';
import { createContext, useState } from 'react';
import { setXmlBinding, toXmlBoolean, useBindableValue } from '../core/binding';
import { useXmlRuntime } from '../core/context';
import { renderNode } from '../core/node';
import {
    requireXmlString,
    resolveXmlEnum,
    resolveXmlLabel,
    resolveXmlSizeValue,
    resolveXmlSpacing,
    resolveXmlString,
} from '../core/props';
import type { Props } from '../types';

export const DialogCloseContext = createContext<(() => void) | null>(null);

/** Renders a controlled Astryx dialog with an optional adapter-owned trigger. */
export function Dialog({ props, nodes }: Props) {
    const { scope: ctx, services } = useXmlRuntime();
    const binding = useBindableValue(props, 'isOpen', ctx);
    const [localOpen, setLocalOpen] = useState(toXmlBoolean(binding.initialValue));
    const isOpen = binding.bound ? toXmlBoolean(binding.currentValue) : localOpen;
    const title = resolveXmlLabel(props, ctx, services, 'Dialog', 'title');
    const triggerLabel =
        props.triggerLabel == null ? undefined : requireXmlString(props, 'triggerLabel', ctx, 'Dialog');
    const purpose = resolveXmlEnum(props, 'purpose', ctx, ['required', 'form', 'info'], 'info', 'Dialog');
    const variant = resolveXmlEnum(props, 'variant', ctx, ['standard', 'fullscreen'], 'standard', 'Dialog');

    /** Writes open-state changes to bound or local state. */
    function setOpen(nextOpen: boolean) {
        setXmlBinding(binding, setLocalOpen, nextOpen);
    }

    /** Closes this dialog after a nested action succeeds. */
    function close() {
        setOpen(false);
    }

    return (
        <>
            {triggerLabel && (
                <Button
                    clickAction={() => setOpen(true)}
                    label={triggerLabel}
                />
            )}
            <DialogCloseContext.Provider value={close}>
                <AstryxDialog
                    isOpen={isOpen}
                    maxHeight={resolveXmlSizeValue(props, 'maxHeight', ctx)}
                    onOpenChange={setOpen}
                    padding={resolveXmlSpacing(props, 'padding', ctx)}
                    purpose={purpose}
                    variant={variant}
                    width={resolveXmlSizeValue(props, 'width', ctx)}
                >
                    <Layout
                        header={
                            <DialogHeader
                                onOpenChange={purpose === 'required' ? undefined : setOpen}
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
