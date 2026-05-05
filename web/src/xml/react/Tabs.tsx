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
    const { ctx } = useRuntime();
    return <UITabs>{renderNode(children, ctx)}</UITabs>;
}

export function TabsList({ children }: BaseProps) {
    const { ctx } = useRuntime();
    return <UITabsList>{renderNode(children, ctx)}</UITabsList>;
}

export function TabsTrigger({ value, children }: BaseProps & { value?: string }) {
    const { ctx } = useRuntime();
    if (!value) throw new Error('TabsTrigger requires a "value" parameter');
    return <UITabsTrigger value={value}>{renderNode(children, ctx)}</UITabsTrigger>;
}

export function TabsContent({ value, children }: BaseProps & { value?: string }) {
    const { ctx } = useRuntime();
    if (!value) throw new Error('TabsContent requires a "value" parameter');
    return <UITabsContent value={value}>{renderNode(children, ctx)}</UITabsContent>;
}
