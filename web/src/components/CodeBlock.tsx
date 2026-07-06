import { useTranslation } from '@/lib/i18n';
import { CheckIcon, ClipboardCopyIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CodeBlockProps = {
    children: string;
    className?: string;
    language?: string;
};

/** Renders a syntax-highlighted code block for docs and examples. */
export function CodeBlock({ children, className, language = 'text' }: CodeBlockProps) {
    const { t } = useTranslation();
    const [isCopied, setIsCopied] = useState(false);
    const resetCopyTimer = useRef<number | null>(null);

    // Trim shared JSX indentation without changing the actual code content.
    const code = children.trim();
    const isSingleLine = code.split('\n').length === 1;

    useEffect(() => {
        return () => {
            if (resetCopyTimer.current != null) {
                window.clearTimeout(resetCopyTimer.current);
                resetCopyTimer.current = null;
            }
        };
    }, []);

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
                    style={oneDark}
                    customStyle={{
                        margin: 0,
                        padding: '0.75rem',
                        background: 'transparent',
                        fontSize: '0.875rem',
                        lineHeight: '1.5rem',
                    }}
                    codeTagProps={{ className: 'font-mono' }}
                    wrapLongLines
                >
                    {code}
                </SyntaxHighlighter>
            </div>
        </div>
    );
}
