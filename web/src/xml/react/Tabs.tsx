import {
    Tabs as UITabs,
    TabsContent as UITabsContent,
    TabsList as UITabsList,
    TabsTrigger as UITabsTrigger,
} from '@ui/tabs';
import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML Tabs component. */
export interface TabsProps {
    children?: ASTNode[];
    defaultValue?: string;
    orientation?: string;
}

/** Props accepted by the XML TabsList component. */
export interface TabsListProps {
    children?: ASTNode[];
    variant?: string;
}

/** Props accepted by the XML TabsTrigger component. */
export interface TabsTriggerProps {
    children?: ASTNode[];
    value?: string;
}

/** Props accepted by the XML TabsContent component. */
export interface TabsContentProps {
    children?: ASTNode[];
    value?: string;
}

/** Renders a shadcn-backed tabs shell. */
export function Tabs({ children, defaultValue, orientation = 'horizontal' }: TabsProps) {
    const { ctx } = useXmlContext();

    return (
        <UITabs defaultValue={defaultValue} orientation={orientation as never}>
            {renderNode(children ?? [], ctx)}
        </UITabs>
    );
}

/** Renders the tabs list slot. */
export function TabsList({ children, variant = 'default' }: TabsListProps) {
    const { ctx } = useXmlContext();

    return <UITabsList variant={variant as never}>{renderNode(children ?? [], ctx)}</UITabsList>;
}

/** Renders an individual tabs trigger. */
export function TabsTrigger({ children, value }: TabsTriggerProps) {
    const { ctx } = useXmlContext();

    if (!value) throw new Error('TabsTrigger requires a value');

    return <UITabsTrigger value={value}>{renderNode(children ?? [], ctx)}</UITabsTrigger>;
}

/** Renders a tabs content panel. */
export function TabsContent({ children, value }: TabsContentProps) {
    const { ctx } = useXmlContext();

    if (!value) throw new Error('TabsContent requires a value');

    return (
        <UITabsContent value={value} className="flex flex-1 flex-col gap-6 text-sm outline-none">
            {renderNode(children ?? [], ctx)}
        </UITabsContent>
    );
}
