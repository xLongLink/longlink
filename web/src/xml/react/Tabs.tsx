import {
    Tabs as UITabs,
    TabsContent as UITabsContent,
    TabsList as UITabsList,
    TabsTrigger as UITabsTrigger,
} from '@/ui/tabs';
import { renderNode, useRuntime } from '@/xml';
import type { ComponentProps, ReactNode } from 'react';

type BaseProps = { children?: ReactNode };
export function Tabs({ children, ...props }: BaseProps & ComponentProps<typeof UITabs>) {
    const { registry, ctx } = useRuntime();
    return <UITabs {...props}>{renderNode(children as any, registry, ctx)}</UITabs>;
}
export function TabsList({ children, ...props }: BaseProps & ComponentProps<typeof UITabsList>) {
    const { registry, ctx } = useRuntime();
    return <UITabsList {...props}>{renderNode(children as any, registry, ctx)}</UITabsList>;
}
export function TabsTrigger({ children, ...props }: BaseProps & ComponentProps<typeof UITabsTrigger>) {
    const { registry, ctx } = useRuntime();
    return <UITabsTrigger {...props}>{renderNode(children as any, registry, ctx)}</UITabsTrigger>;
}
export function TabsContent({ children, ...props }: BaseProps & ComponentProps<typeof UITabsContent>) {
    const { registry, ctx } = useRuntime();
    return <UITabsContent {...props}>{renderNode(children as any, registry, ctx)}</UITabsContent>;
}
export default Tabs;
