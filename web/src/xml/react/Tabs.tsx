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
    className?: string;
    defaultValue?: string;
    orientation?: string;
}

/** Props accepted by the XML TabsList component. */
export interface TabsListProps {
    children?: ASTNode[];
    className?: string;
    variant?: string;
}

/** Props accepted by the XML TabsTrigger component. */
export interface TabsTriggerProps {
    children?: ASTNode[];
    className?: string;
    value?: string;
}

/** Props accepted by the XML TabsContent component. */
export interface TabsContentProps {
    children?: ASTNode[];
    className?: string;
    value?: string;
}

/** Renders a shadcn-backed tabs shell. */
export function Tabs({ children, className: _className, defaultValue, orientation = 'horizontal' }: TabsProps) {
    const { ctx } = useXmlContext();

    return <UITabs defaultValue={defaultValue} orientation={orientation as never}>{renderNode(children ?? [], ctx)}</UITabs>;
}

/** Renders the tabs list slot. */
export function TabsList({ children, className: _className, variant = 'default' }: TabsListProps) {
    const { ctx } = useXmlContext();

    return <UITabsList variant={variant as never}>{renderNode(children ?? [], ctx)}</UITabsList>;
}

/** Renders an individual tabs trigger. */
export function TabsTrigger({ children, className: _className, value }: TabsTriggerProps) {
    const { ctx } = useXmlContext();

    if (!value) throw new Error('TabsTrigger requires a value');

    return <UITabsTrigger value={value}>{renderNode(children ?? [], ctx)}</UITabsTrigger>;
}

/** Renders a tabs content panel. */
export function TabsContent({ children, className: _className, value }: TabsContentProps) {
    const { ctx } = useXmlContext();

    if (!value) throw new Error('TabsContent requires a value');

    return <UITabsContent value={value}>{renderNode(children ?? [], ctx)}</UITabsContent>;
}
