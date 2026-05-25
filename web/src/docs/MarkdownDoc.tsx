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
import { Ul } from '@/components/ui/ul';

type MarkdownDocProps = {
    content: string;
};

type MarkdownCodeProps = {
    children?: ReactNode;
    className?: string;
    inline?: boolean;
};

/** Renders a markdown-backed docs article. */
export default function MarkdownDoc({ content }: MarkdownDocProps) {
    return (
        <article className="space-y-8">
            <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
        </article>
    );
}

const markdownComponents: Components = {
    h1: ({ children }) => <MarkdownHeading level="h1">{children}</MarkdownHeading>,
    h2: ({ children }) => <MarkdownHeading level="h2">{children}</MarkdownHeading>,
    h3: ({ children }) => <MarkdownHeading level="h3">{children}</MarkdownHeading>,
    h4: ({ children }) => <MarkdownHeading level="h4">{children}</MarkdownHeading>,
    p: ({ children }) => <P className="max-w-3xl text-muted-foreground">{children}</P>,
    ul: ({ children }) => <Ul className="max-w-3xl text-muted-foreground">{children}</Ul>,
    ol: ({ children }) => <Ol className="max-w-3xl text-muted-foreground">{children}</Ol>,
    li: ({ children }) => <Li>{children}</Li>,
    a: ({ href, children }) => <MarkdownLink href={href}>{children}</MarkdownLink>,
    code: (props) => <MarkdownCode {...(props as MarkdownCodeProps)} />,
};

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

    if (inline) {
        return <Code className={className}>{code}</Code>;
    }

    const language = className?.match(/language-([\w-]+)/)?.[1] ?? 'text';

    // XML examples get the interactive preview window used elsewhere in the app.
    if (language === 'xml') {
        return <XmlWindow>{code}</XmlWindow>;
    }

    return <CodeBlock language={language}>{code}</CodeBlock>;
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
