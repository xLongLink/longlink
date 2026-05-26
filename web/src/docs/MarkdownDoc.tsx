import { type ReactNode } from 'react';

import ReactMarkdown, { type Components } from 'react-markdown';
import { Link } from 'react-router';

import { CodeBlock } from '@/components/CodeBlock';
import { XmlWindow } from '@/components/XmlWindow';
import { A } from '@/components/ui/a';
import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { Li } from '@/components/ui/li';
import { Ol } from '@/components/ui/ol';
import { P } from '@/components/ui/p';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ul } from '@/components/ui/ul';

type MarkdownDocProps = {
    content: string;
};

type MarkdownBlock =
    | {
          kind: 'markdown';
          content: string;
      }
    | {
          kind: 'tabs';
          tabs: MarkdownTab[];
      };

type MarkdownTab = {
    label: string;
    content: string;
};

type MarkdownCodeProps = {
    children?: ReactNode;
    className?: string;
    inline?: boolean;
};

/** Renders a markdown-backed docs article. */
export default function MarkdownDoc({ content }: MarkdownDocProps) {
    const blocks = splitMarkdownBlocks(content);

    return (
        <article className="mx-auto w-full max-w-2xl space-y-6">
            {blocks.map((block, index) => {
                if (block.kind === 'tabs') {
                    return <MarkdownTabs key={`tabs-${index}`} tabs={block.tabs} />;
                }

                return (
                    <ReactMarkdown key={`markdown-${index}`} components={markdownComponents}>
                        {block.content}
                    </ReactMarkdown>
                );
            })}
        </article>
    );
}

const markdownComponents: Components = {
    h1: ({ children }) => <MarkdownHeading level="h1">{children}</MarkdownHeading>,
    h2: ({ children }) => <MarkdownHeading level="h2">{children}</MarkdownHeading>,
    h3: ({ children }) => <MarkdownHeading level="h3">{children}</MarkdownHeading>,
    h4: ({ children }) => <MarkdownHeading level="h4">{children}</MarkdownHeading>,
    p: ({ children }) => <P className="max-w-2xl text-muted-foreground">{children}</P>,
    ul: ({ children }) => <Ul className="max-w-2xl text-muted-foreground">{children}</Ul>,
    ol: ({ children }) => <Ol className="max-w-2xl text-muted-foreground">{children}</Ol>,
    li: ({ children }) => <Li>{children}</Li>,
    a: ({ href, children }) => <MarkdownLink href={href}>{children}</MarkdownLink>,
    code: (props) => <MarkdownCode {...(props as MarkdownCodeProps)} />,
};

/** Renders a tabbed docs block parsed from ::: tabs markdown. */
function MarkdownTabs({ tabs }: { tabs: MarkdownTab[] }) {
    const defaultValue = tabs[0]?.label ?? '';

    return (
        <Tabs defaultValue={defaultValue} className="!gap-3">
            <TabsList variant="line">
                {tabs.map((tab) => (
                    <TabsTrigger key={tab.label} value={tab.label}>
                        {tab.label}
                    </TabsTrigger>
                ))}
            </TabsList>
            {tabs.map((tab) => (
                <TabsContent key={tab.label} value={tab.label} className="!pt-0">
                    <ReactMarkdown components={markdownComponents}>{tab.content}</ReactMarkdown>
                </TabsContent>
            ))}
        </Tabs>
    );
}

/** Renders a markdown heading with a generated anchor id. */
function MarkdownHeading({ children, level }: { children: ReactNode; level: 'h1' | 'h2' | 'h3' | 'h4' }) {
    const text = extractText(children);
    const id = slugifyText(text);

    return (
        <Heading id={id} level={level} className="text-foreground">
            {children}
        </Heading>
    );
}

/** Renders internal docs links with client-side routing. */
function MarkdownLink({ children, href }: { children: ReactNode; href?: string }) {
    if (!href) {
        return <A>{children}</A>;
    }

    // Keep docs routes on the client and open external references in a new tab.
    if (href.startsWith('/')) {
        return (
            <Link to={href} className="font-medium text-foreground hover:underline">
                {children}
            </Link>
        );
    }

    return (
        <A href={href} target="_blank" rel="noopener noreferrer">
            {children}
        </A>
    );
}

/** Renders inline code or fenced code blocks. */
function MarkdownCode({ children, className, inline }: MarkdownCodeProps) {
    const code = String(children).replace(/\n$/, '');
    const isInline = inline ?? !className?.startsWith('language-');

    if (isInline) {
        return <Code className={className}>{code}</Code>;
    }

    const language = className?.match(/language-([\w-]+)/)?.[1] ?? 'text';

    // XML examples get the interactive preview window used elsewhere in the app.
    if (language === 'xml') {
        return <XmlWindow>{code}</XmlWindow>;
    }

    return <CodeBlock language={language}>{code}</CodeBlock>;
}

/** Splits markdown into regular blocks and tabs directives. */
function splitMarkdownBlocks(content: string): MarkdownBlock[] {
    const lines = content.split('\n');
    const blocks: MarkdownBlock[] = [];
    const markdownLines: string[] = [];
    let tabs: MarkdownTab[] = [];
    let tabLabel = '';
    let tabLines: string[] = [];
    let inTabs = false;

    // Keep regular markdown together, but peel out tabs containers so they can render as interactive UI.
    const flushMarkdown = () => {
        const markdown = markdownLines.join('\n').trim();

        if (markdown) {
            blocks.push({ kind: 'markdown', content: markdown });
        }

        markdownLines.length = 0;
    };

    // Tabs are declared as a container with one or more `== label` sections.
    const flushTab = () => {
        if (!tabLabel) {
            tabLines.length = 0;
            return;
        }

        const content = tabLines.join('\n').trim();

        tabs.push({ label: tabLabel, content });
        tabLabel = '';
        tabLines.length = 0;
    };

    for (const line of lines) {
        const trimmed = line.trim();

        if (!inTabs) {
            if (trimmed === '::: tabs') {
                flushMarkdown();
                inTabs = true;
                continue;
            }

            markdownLines.push(line);
            continue;
        }

        if (trimmed === ':::') {
            flushTab();

            if (tabs.length > 0) {
                blocks.push({ kind: 'tabs', tabs });
            }

            tabs = [];
            inTabs = false;
            continue;
        }

        if (trimmed.startsWith('== ')) {
            flushTab();
            tabLabel = trimmed.slice(3).trim();
            continue;
        }

        if (!tabLabel && trimmed === '') {
            continue;
        }

        tabLines.push(line);
    }

    if (inTabs) {
        markdownLines.push('::: tabs');

        if (tabs.length > 0 || tabLabel || tabLines.length > 0) {
            if (tabLabel || tabLines.length > 0) {
                markdownLines.push('');
                markdownLines.push(...tabs.flatMap((tab) => ['== ' + tab.label, tab.content]));
            }
        }
    }

    flushMarkdown();

    return blocks;
}

/** Extracts plain text from markdown heading children for slug generation. */
function extractText(node: ReactNode): string {
    if (typeof node === 'string' || typeof node === 'number') {
        return String(node);
    }

    if (Array.isArray(node)) {
        return node.map((child) => extractText(child)).join(' ');
    }

    if (node && typeof node === 'object' && 'props' in node) {
        return extractText((node as { props?: { children?: ReactNode } }).props?.children);
    }

    return '';
}

/** Converts heading text into a URL-safe slug. */
function slugifyText(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
