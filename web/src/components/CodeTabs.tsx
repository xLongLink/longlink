import { CodeBlock } from '@/components/CodeBlock';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type CodeTabsProps = {
    pip: string;
    uv: string;
};

/** Renders a two-tab code sample for uv and pip install flows. */
export function CodeTabs({ pip, uv }: CodeTabsProps) {
    return (
        <Tabs defaultValue="uv" className="!gap-1">
            <TabsList variant="line">
                <TabsTrigger value="uv">[uv]</TabsTrigger>
                <TabsTrigger value="pip">[pip]</TabsTrigger>
            </TabsList>
            <TabsContent value="uv" className="!pt-1">
                <CodeBlock language="bash">{uv}</CodeBlock>
            </TabsContent>
            <TabsContent value="pip" className="!pt-1">
                <CodeBlock language="bash">{pip}</CodeBlock>
            </TabsContent>
        </Tabs>
    );
}
