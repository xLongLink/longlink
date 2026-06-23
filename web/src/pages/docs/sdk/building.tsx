import { CodeBlock } from '@/components/CodeBlock';
import { Heading } from '@/components/ui/heading';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const metadata = {
    lastUpdated: '2026-06-23',
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
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">
                    longlink build
                </code>{' '}
                generates the{' '}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">Dockerfile</code>{' '}
                and the{' '}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">
                    manifest.json
                </code>
                .
            </li>
            <li>
                The generated <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">Dockerfile</code>{' '}
                includes labels for the app and SDK versions.
            </li>
            <li>Once containerized, applications can be pushed to any registry.</li>
            <li>Applications can be connected to the control plane and deployed.</li>
        </ul>
        <div className="flex flex-col gap-2">
            <Heading id="docker-labels" level="h2">
                Docker Labels
            </Heading>
            <p className="leading-7">
                The build command writes these labels into the image metadata:
            </p>
            <CodeBlock language="text">
                {'longlink.name=<app-name>\nlonglink.sdk=<installed-longlink-version>\nlonglink.version=<app-pyproject-version>\nlonglink.description=<app-description>'}
            </CodeBlock>
            <ul className="ml-6 list-disc space-y-2">
                <li><code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">longlink.name</code> is the application name.</li>
                <li><code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">longlink.sdk</code> is the installed LongLink SDK version.</li>
                <li><code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">longlink.version</code> is the application version from <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">pyproject.toml</code>.</li>
                <li><code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">longlink.title</code> is the optional application title.</li>
                <li><code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">longlink.summary</code> is the optional short summary.</li>
                <li><code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">longlink.terms_of_service</code> is the optional terms-of-service URL.</li>
                <li><code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">longlink.contact</code> is the optional contact metadata.</li>
                <li><code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">longlink.license_info</code> is the optional license metadata.</li>
                <li><code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">longlink.environments</code> lists the app environment variables when <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">src/envs.py</code> exists.</li>
            </ul>
        </div>
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
