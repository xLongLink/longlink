import {
    Tabs as UITabs,
    TabsContent as UITabsContent,
    TabsList as UITabsList,
    TabsTrigger as UITabsTrigger,
} from '@/ui/tabs';
import type { XmlComponentProps } from '@/xml';
import { renderXml, useProps } from '@/xml';

export function Tabs({ props: _props, children }: XmlComponentProps) {
    return <UITabs>{renderXml(children)}</UITabs>;
}

export function TabsList({ props: _props, children }: XmlComponentProps) {
    return <UITabsList>{renderXml(children)}</UITabsList>;
}

export function TabsTrigger({ props: rawProps, children }: XmlComponentProps) {
    const props = useProps(rawProps as Record<string, string>);
    const value = String(props.value ?? '');
    if (!value) throw new Error('TabsTrigger requires a "value" parameter');
    return <UITabsTrigger value={value}>{renderXml(children)}</UITabsTrigger>;
}

export function TabsContent({ props: rawProps, children }: XmlComponentProps) {
    const props = useProps(rawProps as Record<string, string>);
    const value = String(props.value ?? '');
    if (!value) throw new Error('TabsContent requires a "value" parameter');
    return <UITabsContent value={value}>{renderXml(children)}</UITabsContent>;
}
