import {
    Tabs as UITabs,
    TabsContent as UITabsContent,
    TabsList as UITabsList,
    TabsTrigger as UITabsTrigger,
} from '@ui/tabs';
import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';
import { resolveXmlString } from './props';

/** Props accepted by the XML Tabs component. */
export interface TabsProps extends Props {}

/** Props accepted by the XML TabsList component. */
export interface TabsListProps extends Props {}

/** Props accepted by the XML TabsTrigger component. */
export interface TabsTriggerProps extends Props {}

/** Props accepted by the XML TabsContent component. */
export interface TabsContentProps extends Props {}

/** Renders a shadcn-backed tabs shell. */
export function Tabs({ props, nodes }: TabsProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
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
export function TabsList({ props, nodes }: TabsListProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;
    const variant = resolveXmlString(props, 'variant', ctx, 'default');

    return <UITabsList variant={variant as never}>{renderNode(children ?? [], ctx)}</UITabsList>;
}

/** Renders an individual tabs trigger. */
export function TabsTrigger({ props, nodes }: TabsTriggerProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;
    const value = resolveXmlString(props, 'value', ctx);

    if (!value) throw new Error('TabsTrigger requires a value');

    return <UITabsTrigger value={value}>{renderNode(children ?? [], ctx)}</UITabsTrigger>;
}

/** Renders a tabs content panel. */
export function TabsContent({ props, nodes }: TabsContentProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;
    const value = resolveXmlString(props, 'value', ctx);

    if (!value) throw new Error('TabsContent requires a value');

    return (
        <UITabsContent value={value} className="flex flex-1 flex-col gap-6 text-sm outline-none">
            {renderNode(children ?? [], ctx)}
        </UITabsContent>
    );
}
