import type { Props } from '../types';
import { createContext } from 'react';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { Stack } from '@astryxdesign/core/Stack';
import { useBindableValue } from '../core/binding';
import { Button } from '@astryxdesign/core/Button';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { requireXmlString, resolveXml, resolveXmlGap } from '../core/props';
import { Dialog as AstryxDialog, DialogHeader } from '@astryxdesign/core/Dialog';

export const DialogCloseContext = createContext<(() => void) | null>(null);

export function Dialog({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'isOpen', ctx, (value) => value !== 'false' && Boolean(value));
    const title = requireXmlString(props, 'title', ctx, 'Dialog');
    const triggerLabel =
        props.triggerLabel == null ? undefined : requireXmlString(props, 'triggerLabel', ctx, 'Dialog');
    const purposeValue = resolveXml(props, 'purpose', ctx);
    const purpose =
        purposeValue === 'required' || purposeValue === 'form' || purposeValue === 'info' ? purposeValue : 'info';
    const subtitle = resolveXml(props, 'subtitle', ctx);
    const gap = resolveXmlGap(props, ctx, 'Dialog');

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
                                <Stack gap={gap}>{renderNode(nodes, ctx)}</Stack>
                            </LayoutContent>
                        }
                    />
                </AstryxDialog>
            </DialogCloseContext.Provider>
        </>
    );
}
