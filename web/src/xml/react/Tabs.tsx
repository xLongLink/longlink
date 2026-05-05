import {
    Tabs as UITabs,
    TabsContent as UITabsContent,
    TabsList as UITabsList,
    TabsTrigger as UITabsTrigger,
} from '@/ui/tabs';
import type { RenderableASTNode } from '@/xml';
import { renderNode, useRuntime } from '@/xml';

type BaseProps = { children?: RenderableASTNode };

export function Tabs({ children }: BaseProps) {
    const { registry, ctx } = useRuntime();
    return <UITabs>{renderNode(children, registry, ctx)}</UITabs>;
}


export function TabsList({ children }: BaseProps) {
    const { registry, ctx } = useRuntime();
    return <UITabsList>{renderNode(children, registry, ctx)}</UITabsList>;
}


export function TabsTrigger({ children }: BaseProps) {
    const { registry, ctx } = useRuntime();
    return <UITabsTrigger>{renderNode(children, registry, ctx)}</UITabsTrigger>;
}


export function TabsContent({ children }: BaseProps) {
    const { registry, ctx } = useRuntime();
    return <UITabsContent>{renderNode(children, registry, ctx)}</UITabsContent>;
}
