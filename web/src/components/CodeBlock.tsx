import { useTranslation } from '@/lib/i18n';
import { CheckIcon, ClipboardCopyIcon } from 'lucide-react';
import { startTransition, useEffect, useRef, useState, type ComponentType, type CSSProperties } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SyntaxHighlighterComponent = ComponentType<{
    children: string;
    codeTagProps?: { className?: string };
    customStyle?: CSSProperties;
    language?: string;
    style?: Record<string, CSSProperties>;
    wrapLongLines?: boolean;
}> & {
    registerLanguage?: (name: string, language: unknown) => void;
};

type LoadedSyntaxHighlighter = {
    Component: SyntaxHighlighterComponent;
    style: Record<string, CSSProperties>;
};

const codeBlockSyntaxStyle = {
    margin: 0,
    padding: '0.75rem',
    background: 'transparent',
    fontSize: '0.875rem',
    lineHeight: '1.5rem',
} satisfies CSSProperties;

let syntaxHighlighterPromise: Promise<LoadedSyntaxHighlighter> | null = null;


/** Loads the Prism highlighter only after a code block needs it. */
function loadSyntaxHighlighter(): Promise<LoadedSyntaxHighlighter> {
    if (!syntaxHighlighterPromise) {
        syntaxHighlighterPromise = Promise.all([
            // @ts-expect-error react-syntax-highlighter does not ship declarations for this optimized subpath.
            import('react-syntax-highlighter/dist/esm/prism-light'),
            // @ts-expect-error react-syntax-highlighter does not ship declarations for this optimized subpath.
            import('react-syntax-highlighter/dist/esm/styles/prism'),
            // @ts-expect-error react-syntax-highlighter does not ship declarations for this optimized subpath.
            import('react-syntax-highlighter/dist/esm/languages/prism/markup'),
            // @ts-expect-error react-syntax-highlighter does not ship declarations for this optimized subpath.
            import('react-syntax-highlighter/dist/esm/languages/prism/bash'),
            // @ts-expect-error react-syntax-highlighter does not ship declarations for this optimized subpath.
            import('react-syntax-highlighter/dist/esm/languages/prism/python'),
            // @ts-expect-error react-syntax-highlighter does not ship declarations for this optimized subpath.
            import('react-syntax-highlighter/dist/esm/languages/prism/toml'),
            // @ts-expect-error react-syntax-highlighter does not ship declarations for this optimized subpath.
            import('react-syntax-highlighter/dist/esm/languages/prism/json'),
        ])
            .then(([syntaxHighlighterModule, styleModule, markup, bash, python, toml, json]) => {
                const Component = syntaxHighlighterModule.default as unknown as SyntaxHighlighterComponent;

                Component.registerLanguage?.('markup', markup.default);
                Component.registerLanguage?.('xml', markup.default);
                Component.registerLanguage?.('bash', bash.default);
                Component.registerLanguage?.('python', python.default);
                Component.registerLanguage?.('toml', toml.default);
                Component.registerLanguage?.('json', json.default);

                return {
                    Component,
                    style: styleModule.oneDark as Record<string, CSSProperties>,
                };
            })
            .catch((error) => {
                syntaxHighlighterPromise = null;
                throw error;
            });
    }

    return syntaxHighlighterPromise;
}


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
    const [isVisible, setIsVisible] = useState(false);
    const [syntaxHighlighter, setSyntaxHighlighter] = useState<LoadedSyntaxHighlighter | null>(null);
    const blockRef = useRef<HTMLDivElement>(null);
    const resetCopyTimer = useRef<number | null>(null);

    // Trim shared JSX indentation without changing the actual code content.
    const code = children.trim();
    const isSingleLine = code.split('\n').length === 1;
    const SyntaxHighlighter = syntaxHighlighter?.Component;

    useEffect(() => {
        return () => {
            if (resetCopyTimer.current != null) {
                window.clearTimeout(resetCopyTimer.current);
                resetCopyTimer.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const blockElement = blockRef.current;

        if (!blockElement || isVisible) {
            return;
        }

        if (!('IntersectionObserver' in window)) {
            setIsVisible(true);
            return;
        }

        // Keep route changes fast by deferring Prism work until the snippet is close to view.
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry?.isIntersecting) {
                    return;
                }

                setIsVisible(true);
                observer.disconnect();
            },
            { rootMargin: '320px 0px' }
        );

        observer.observe(blockElement);

        return () => observer.disconnect();
    }, [isVisible]);

    useEffect(() => {
        if (!isVisible || syntaxHighlighter) {
            return;
        }

        let isCancelled = false;

        // Let the page paint before downloading and mounting the syntax highlighter chunk.
        const loadTimer = window.setTimeout(() => {
            void loadSyntaxHighlighter()
                .then((loadedSyntaxHighlighter) => {
                    if (isCancelled) {
                        return;
                    }

                    startTransition(() => {
                        setSyntaxHighlighter(loadedSyntaxHighlighter);
                    });
                })
                .catch(() => undefined);
        }, 80);

        return () => {
            isCancelled = true;
            window.clearTimeout(loadTimer);
        };
    }, [isVisible, syntaxHighlighter]);

    // Copy the visible snippet to the clipboard and briefly confirm success.
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            toast.success(t('toasts.copiedToClipboard'));
            setIsCopied(true);

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

                {SyntaxHighlighter ? (
                    <SyntaxHighlighter
                        language={language}
                        style={syntaxHighlighter.style}
                        customStyle={codeBlockSyntaxStyle}
                        codeTagProps={{ className: 'font-mono' }}
                        wrapLongLines
                    >
                        {code}
                    </SyntaxHighlighter>
                ) : (
                    <pre className="m-0 whitespace-pre-wrap break-words bg-transparent p-3 font-mono text-sm leading-6 text-foreground">
                        <code>{code}</code>
                    </pre>
                )}
            </div>
        </div>
    );
}
