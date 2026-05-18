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
    children?: ASTNode | ASTNode[] | null;
    className?: string;
    defaultValue?: string;
    orientation?: string;
}

/** Props accepted by the XML TabsList component. */
export interface TabsListProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
    variant?: string;
}

/** Props accepted by the XML TabsTrigger component. */
export interface TabsTriggerProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
    value?: string;
}

/** Props accepted by the XML TabsContent component. */
export interface TabsContentProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
    value?: string;
}

/** Renders a shadcn-backed tabs shell. */
export function Tabs({ children, className, defaultValue, orientation = 'horizontal' }: TabsProps) {
    const { ctx } = useXmlContext();

    return (
        <UITabs className={className} defaultValue={defaultValue} orientation={orientation as never}>
            {renderNode(children ?? null, ctx)}
        </UITabs>
    );
}

/** Renders the tabs list slot. */
export function TabsList({ children, className, variant = 'default' }: TabsListProps) {
    const { ctx } = useXmlContext();

    return (
        <UITabsList className={className} variant={variant as never}>
            {renderNode(children ?? null, ctx)}
        </UITabsList>
    );
}

/** Renders an individual tabs trigger. */
export function TabsTrigger({ children, className, value }: TabsTriggerProps) {
    const { ctx } = useXmlContext();

    if (!value) throw new Error('TabsTrigger requires a value');

    return (
        <UITabsTrigger className={className} value={value}>
            {renderNode(children ?? null, ctx)}
        </UITabsTrigger>
    );
}

/** Renders a tabs content panel. */
export function TabsContent({ children, className, value }: TabsContentProps) {
    const { ctx } = useXmlContext();

    if (!value) throw new Error('TabsContent requires a value');

    return (
        <UITabsContent className={className} value={value}>
            {renderNode(children ?? null, ctx)}
        </UITabsContent>
    );
}
