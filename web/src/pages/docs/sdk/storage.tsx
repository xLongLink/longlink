import { CodeBlock } from '@/components/CodeBlock';
import { A } from '@/components/ui/a';
import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Cloud, FlaskConical, Laptop } from 'lucide-react';

const environmentIcons = {
    Development: Laptop,
    Production: Cloud,
    Testing: FlaskConical,
} as const;

export const metadata = {
    lastUpdated: '2026-07-10',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/storage.tsx',
};

export const content = (
    <Stack>
        <Heading id="storage" level="h2">
            Storage
        </Heading>
        <P>
            The SDK exposes an application-scoped <Code>fs</Code> object backed by{' '}
            <A href="https://filesystem-spec.readthedocs.io/en/latest/">fsspec</A>. Application code uses the same
            filesystem interface in local development, tests, and production.
        </P>
        <div className="overflow-hidden rounded-md border">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="bg-muted/50">Environment</TableHead>
                        <TableHead className="bg-muted/50">Storage backend</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-accent/10 text-accent [&_svg]:size-4 [&_svg]:stroke-[2.5]">
                                    <environmentIcons.Testing aria-hidden={true} className="size-4" />
                                </div>
                                <Code>Testing</Code>
                            </div>
                        </TableCell>
                        <TableCell className="whitespace-normal text-muted-foreground">
                            <Code>memory</Code> backend for isolated in-memory test files.
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-accent/10 text-accent [&_svg]:size-4 [&_svg]:stroke-[2.5]">
                                    <environmentIcons.Development aria-hidden={true} className="size-4" />
                                </div>
                                <Code>Development</Code>
                            </div>
                        </TableCell>
                        <TableCell className="whitespace-normal text-muted-foreground">
                            <Code>file</Code> backend for inspectable local files.
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-accent/10 text-accent [&_svg]:size-4 [&_svg]:stroke-[2.5]">
                                    <environmentIcons.Production aria-hidden={true} className="size-4" />
                                </div>
                                <Code>Production</Code>
                            </div>
                        </TableCell>
                        <TableCell className="whitespace-normal text-muted-foreground">
                            <Code>s3</Code> backend for application and shared buckets.
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
        <P>
            Runtime storage credentials are scoped before deployment: apps can read and write their own bucket, and can
            read the organization shared bucket without writing to it.
        </P>
        <Heading id="usage" level="h2">
            Usage
        </Heading>
        <CodeBlock language="python">{`from longlink import fs

with fs.open("reports/example.txt", "wb") as f:
    f.write(b"hello")`}</CodeBlock>
        <Heading id="assets" level="h2">
            Assets
        </Heading>
        <P>
            Organization-level assets live in shared storage. The SDK exposes <Code>longlink.assets.logo()</Code> for
            the organization logo, using a bundled fallback in development and testing and the organization shared
            bucket in production.
        </P>
        <CodeBlock language="python">{`from longlink import assets

logo = assets.logo()`}</CodeBlock>
    </Stack>
);
