import { createContext } from 'react';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { Dialog as AstryxDialog, DialogHeader } from '@astryxdesign/core/Dialog';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { requireXmlString, resolveXml } from '../core/props';
import { toXmlBoolean, useBindableValue } from '../core/binding';

export const DialogCloseContext = createContext<(() => void) | null>(null);

export function Dialog({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'isOpen', ctx, toXmlBoolean);
    const title = requireXmlString(props, 'title', ctx, 'Dialog');
    const triggerLabel =
        props.triggerLabel == null ? undefined : requireXmlString(props, 'triggerLabel', ctx, 'Dialog');
    const purposeValue = resolveXml(props, 'purpose', ctx);
    const purpose =
        purposeValue === 'required' || purposeValue === 'form' || purposeValue === 'info' ? purposeValue : 'info';
    const subtitle = resolveXml(props, 'subtitle', ctx);

    return (
        <>
            {triggerLabel && <Button clickAction={() => binding.setValue(true)} label={triggerLabel} />}
            <DialogCloseContext.Provider value={() => binding.setValue(false)}>
                <AstryxDialog isOpen={binding.value} onOpenChange={binding.setValue} purpose={purpose}>
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
