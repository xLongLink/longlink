import {
    Tabs as UITabs,
    TabsContent as UITabsContent,
    TabsList as UITabsList,
    TabsTrigger as UITabsTrigger,
} from '@ui/tabs';
import { useXmlContext } from '@xml/core/context';
import { renderNode } from '@xml/core/node';
import type { Props } from '@xml/types';
import { requireXmlString, resolveXmlString } from './props';

/** Renders a shadcn-backed tabs shell. */
export function Tabs({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const defaultValue = resolveXmlString(props, 'defaultValue', ctx);
    const orientation = resolveXmlString(props, 'orientation', ctx, 'horizontal');

    return (
        <UITabs defaultValue={defaultValue} orientation={orientation as never}>
            {renderNode(nodes, ctx)}
        </UITabs>
    );
}

/** Renders the tabs list slot. */
export function TabsList({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const variant = resolveXmlString(props, 'variant', ctx, 'default');

    return <UITabsList variant={variant as never}>{renderNode(nodes, ctx)}</UITabsList>;
}

/** Renders an individual tabs trigger. */
export function TabsTrigger({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const value = requireXmlString(props, 'value', ctx, 'TabsTrigger');

    return <UITabsTrigger value={value}>{renderNode(nodes, ctx)}</UITabsTrigger>;
}

/** Renders a tabs content panel. */
export function TabsContent({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const value = requireXmlString(props, 'value', ctx, 'TabsContent');

    return (
        <UITabsContent value={value} className="flex flex-1 flex-col gap-6 text-sm outline-none">
            {renderNode(nodes, ctx)}
        </UITabsContent>
    );
}
