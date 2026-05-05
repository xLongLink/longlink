import {
    Tabs as UITabs,
    TabsContent as UITabsContent,
    TabsList as UITabsList,
    TabsTrigger as UITabsTrigger,
} from '@/ui/tabs';
import type { RenderableASTNode } from '@/xml';
import { evaluate, renderNode, useContext } from '@/xml';

export function Tabs({ children }: { props: Record<string, string>; children?: RenderableASTNode }) {
    const context = useContext();
    return <UITabs>{renderNode(children, context.ctx)}</UITabs>;
}

export function TabsList({ children }: { props: Record<string, string>; children?: RenderableASTNode }) {
    const context = useContext();
    return <UITabsList>{renderNode(children, context.ctx)}</UITabsList>;
}

export function TabsTrigger({ props, children }: { props: Record<string, string>; children?: RenderableASTNode }) {
    const context = useContext();
    const value = evaluate(props.value ?? '', context, 'string');
    if (!value) throw new Error('TabsTrigger requires a "value" parameter');
    return <UITabsTrigger value={value}>{renderNode(children, context.ctx)}</UITabsTrigger>;
}

export function TabsContent({ props, children }: { props: Record<string, string>; children?: RenderableASTNode }) {
    const context = useContext();
    const value = evaluate(props.value ?? '', context, 'string');
    if (!value) throw new Error('TabsContent requires a "value" parameter');
    return <UITabsContent value={value}>{renderNode(children, context.ctx)}</UITabsContent>;
}
