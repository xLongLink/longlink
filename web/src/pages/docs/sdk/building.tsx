import { CodeBlock } from '@/components/CodeBlock';
import { Heading } from '@/components/ui/heading';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const metadata = {
    lastUpdated: '2026-05-25',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/building.tsx',
};

export const content = (
    <div className="flex flex-col gap-4">
        <Heading id="building" level="h1">
            Building
        </Heading>
        <ul className="ml-6 list-disc space-y-2">
            <li>Applications can be built using Docker.</li>
            <li>
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">longlink build</code>{' '}
                generates the <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">Dockerfile</code>{' '}
                and the <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">manifest.json</code>.
            </li>
            <li>Once containerized, applications can be pushed to any registry.</li>
            <li>Applications can be connected to the control plane and deployed.</li>
        </ul>
        <Tabs defaultValue="pip">
            <TabsList>
                <TabsTrigger value="pip">pip</TabsTrigger>
                <TabsTrigger value="uv">uv</TabsTrigger>
            </TabsList>
            <TabsContent value="pip">
                <CodeBlock language="bash">longlink build</CodeBlock>
            </TabsContent>
            <TabsContent value="uv">
                <CodeBlock language="bash">uv run longlink build</CodeBlock>
            </TabsContent>
        </Tabs>
    </div>
);
