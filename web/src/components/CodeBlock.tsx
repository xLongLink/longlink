import { CheckIcon, ClipboardCopyIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CodeBlockProps = {
    children: string;
    className?: string;
    language?: string;
};

/** Renders a syntax-highlighted code block for docs and examples. */
export function CodeBlock({ children, className, language = 'text' }: CodeBlockProps) {
    const [isCopied, setIsCopied] = useState(false);
    const resetCopyTimer = useRef<number | null>(null);

    // Trim shared JSX indentation without changing the actual code content.
    const code = children.trim();

    // Copy the visible snippet to the clipboard and briefly confirm success.
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
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
            className={cn('overflow-hidden rounded-lg border border-border bg-muted/30', className)}
        >
            <div className="relative">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={isCopied ? 'Copied code' : 'Copy code'}
                    title={isCopied ? 'Copied' : 'Copy'}
                    onClick={handleCopy}
                    className="absolute right-2 top-2 z-10 bg-transparent text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground"
                >
                    {isCopied ? <CheckIcon /> : <ClipboardCopyIcon />}
                </Button>

                <SyntaxHighlighter
                    language={language}
                    style={oneDark}
                    customStyle={{
                        margin: 0,
                        padding: '1rem',
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
