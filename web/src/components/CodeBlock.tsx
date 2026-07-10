import { useTranslation } from '@/lib/i18n';
import { CheckIcon, ClipboardCopyIcon } from 'lucide-react';
import { useEffect, useRef, useState, type ComponentType, type CSSProperties } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
// @ts-expect-error react-syntax-highlighter does not ship declarations for this optimized subpath.
import PrismLight from 'react-syntax-highlighter/dist/esm/prism-light';
// @ts-expect-error react-syntax-highlighter does not ship declarations for this optimized subpath.
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
// @ts-expect-error react-syntax-highlighter does not ship declarations for this optimized subpath.
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
// @ts-expect-error react-syntax-highlighter does not ship declarations for this optimized subpath.
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
// @ts-expect-error react-syntax-highlighter does not ship declarations for this optimized subpath.
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
// @ts-expect-error react-syntax-highlighter does not ship declarations for this optimized subpath.
import toml from 'react-syntax-highlighter/dist/esm/languages/prism/toml';
// @ts-expect-error react-syntax-highlighter does not ship declarations for this optimized subpath.
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

type SyntaxHighlighterComponent = ComponentType<{
    children: string;
    codeTagProps?: { className?: string; style?: CSSProperties };
    customStyle?: CSSProperties;
    language?: string;
    style?: Record<string, CSSProperties>;
    wrapLongLines?: boolean;
}> & {
    registerLanguage?: (name: string, language: unknown) => void;
};

const codeBlockSyntaxStyle = {
    margin: 0,
    padding: '0.75rem',
    background: 'transparent',
    fontSize: '0.875rem',
    lineHeight: '1.5rem',
    overflowWrap: 'normal',
    whiteSpace: 'pre',
    wordBreak: 'normal',
} satisfies CSSProperties;

const codeBlockCodeStyle = {
    overflowWrap: 'normal',
    whiteSpace: 'pre',
    wordBreak: 'normal',
} satisfies CSSProperties;

const SyntaxHighlighter = PrismLight as unknown as SyntaxHighlighterComponent;
const syntaxStyle = oneDark as Record<string, CSSProperties>;

SyntaxHighlighter.registerLanguage?.('markup', markup);
SyntaxHighlighter.registerLanguage?.('xml', markup);
SyntaxHighlighter.registerLanguage?.('bash', bash);
SyntaxHighlighter.registerLanguage?.('python', python);
SyntaxHighlighter.registerLanguage?.('toml', toml);
SyntaxHighlighter.registerLanguage?.('json', json);

/** Renders a syntax-highlighted code block for docs and examples. */
export function CodeBlock({
    children,
    className,
    language = 'text',
}: {
    children: string;
    className?: string;
    language?: string;
}) {
    const { t } = useTranslation();
    const [isCopied, setIsCopied] = useState(false);
    const blockRef = useRef<HTMLDivElement>(null);
    const resetCopyTimer = useRef<number | null>(null);

    // Trim shared JSX indentation without changing the actual code content.
    const code = children.trim();
    const isSingleLine = code.split('\n').length === 1;

    useEffect(() => {
        return () => {
            // Clear pending copy feedback on unmount.
            if (resetCopyTimer.current != null) {
                window.clearTimeout(resetCopyTimer.current);
                resetCopyTimer.current = null;
            }
        };
    }, []);

    // Copy the visible snippet to the clipboard and briefly confirm success.
    const handleCopy = async () => {
        // Write the snippet to the clipboard.
        try {
            await navigator.clipboard.writeText(code);
            toast.success(t('toasts.copiedToClipboard'));
            setIsCopied(true);

            // Replace any existing copy confirmation timer.
            if (resetCopyTimer.current != null) {
                window.clearTimeout(resetCopyTimer.current);
            }

            resetCopyTimer.current = window.setTimeout(() => {
                setIsCopied(false);
            }, 1500);
        } catch {
            setIsCopied(false);
        }
    };

    return (
        <div
            ref={blockRef}
            data-slot="code-block"
            className={cn('w-full max-w-2xl overflow-x-auto rounded-lg border border-border bg-muted/30', className)}
        >
            <div className="relative">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={isCopied ? t('actions.copiedCode') : t('actions.copyCode')}
                    title={isCopied ? t('actions.copied') : t('actions.copy')}
                    onClick={handleCopy}
                    className={cn(
                        'absolute right-2 z-10 cursor-pointer bg-transparent text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground',
                        isSingleLine ? 'top-1/2 -translate-y-1/2' : 'top-2'
                    )}
                >
                    {isCopied ? <CheckIcon className="size-4" /> : <ClipboardCopyIcon className="size-4" />}
                </Button>

                <SyntaxHighlighter
                    language={language}
                    style={syntaxStyle}
                    customStyle={codeBlockSyntaxStyle}
                    codeTagProps={{ className: 'font-mono', style: codeBlockCodeStyle }}
                    wrapLongLines={false}
                >
                    {code}
                </SyntaxHighlighter>
            </div>
        </div>
    );
}
