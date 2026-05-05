import {
    Tabs as UITabs,
    TabsContent as UITabsContent,
    TabsList as UITabsList,
    TabsTrigger as UITabsTrigger,
} from '@/ui/tabs';
import type { XmlComponentProps } from '@/xml';
import { renderNode, useContext } from '@/xml';

export function Tabs({ props: _props, children }: XmlComponentProps) {
    const context = useContext();
    return <UITabs>{renderNode(children, context.ctx)}</UITabs>;
}

export function TabsList({ props: _props, children }: XmlComponentProps) {
    const context = useContext();
    return <UITabsList>{renderNode(children, context.ctx)}</UITabsList>;
}

export function TabsTrigger({ props, children }: XmlComponentProps) {
    const context = useContext();
    const value = String(props.value ?? '');
    if (!value) throw new Error('TabsTrigger requires a "value" parameter');
    return <UITabsTrigger value={value}>{renderNode(children, context.ctx)}</UITabsTrigger>;
}

export function TabsContent({ props, children }: XmlComponentProps) {
    const context = useContext();
    const value = String(props.value ?? '');
    if (!value) throw new Error('TabsContent requires a "value" parameter');
    return <UITabsContent value={value}>{renderNode(children, context.ctx)}</UITabsContent>;
}
