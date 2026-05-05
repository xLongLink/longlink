import {
    Tabs as UITabs,
    TabsContent as UITabsContent,
    TabsList as UITabsList,
    TabsTrigger as UITabsTrigger,
} from '@/ui/tabs';
import type { XmlComponentProps } from '@/xml';
import { evaluate, renderXml, useContext } from '@/xml';

export function Tabs({ props: _props, children }: XmlComponentProps) {
    return <UITabs>{renderXml(children)}</UITabs>;
}

export function TabsList({ props: _props, children }: XmlComponentProps) {
    return <UITabsList>{renderXml(children)}</UITabsList>;
}

export function TabsTrigger({ props: rawProps, children }: XmlComponentProps) {
    const { ctx } = useContext();
    const value = String(evaluate(rawProps.value ?? '', ctx) ?? '');
    if (!value) throw new Error('TabsTrigger requires a "value" parameter');
    return <UITabsTrigger value={value}>{renderXml(children)}</UITabsTrigger>;
}

export function TabsContent({ props: rawProps, children }: XmlComponentProps) {
    const { ctx } = useContext();
    const value = String(evaluate(rawProps.value ?? '', ctx) ?? '');
    if (!value) throw new Error('TabsContent requires a "value" parameter');
    return <UITabsContent value={value}>{renderXml(children)}</UITabsContent>;
}
