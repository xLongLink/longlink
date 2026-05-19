import {
    Tabs as UITabs,
    TabsContent as UITabsContent,
    TabsList as UITabsList,
    TabsTrigger as UITabsTrigger,
} from '@ui/tabs';
import { useXmlContext } from '../core/context';
import { renderNode } from '../core/node';
import type { Props } from '../types';
import { resolveXmlString } from './props';

/** Renders a shadcn-backed tabs shell. */
export function Tabs({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const children = nodes;
    const defaultValue = resolveXmlString(props, 'defaultValue', ctx);
    const orientation = resolveXmlString(props, 'orientation', ctx, 'horizontal');

    return (
        <UITabs defaultValue={defaultValue} orientation={orientation as never}>
            {renderNode(children ?? [], ctx)}
        </UITabs>
    );
}

/** Renders the tabs list slot. */
export function TabsList({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const children = nodes;
    const variant = resolveXmlString(props, 'variant', ctx, 'default');

    return <UITabsList variant={variant as never}>{renderNode(children ?? [], ctx)}</UITabsList>;
}

/** Renders an individual tabs trigger. */
export function TabsTrigger({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const children = nodes;
    const value = resolveXmlString(props, 'value', ctx);

    if (!value) throw new Error('TabsTrigger requires a value');

    return <UITabsTrigger value={value}>{renderNode(children ?? [], ctx)}</UITabsTrigger>;
}

/** Renders a tabs content panel. */
export function TabsContent({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const children = nodes;
    const value = resolveXmlString(props, 'value', ctx);

    if (!value) throw new Error('TabsContent requires a value');

    return (
        <UITabsContent value={value} className="flex flex-1 flex-col gap-6 text-sm outline-none">
            {renderNode(children ?? [], ctx)}
        </UITabsContent>
    );
}
