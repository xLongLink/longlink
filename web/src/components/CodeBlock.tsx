import { useToast } from '@astryxdesign/core/Toast';
import { useTranslator } from '@astryxdesign/core/i18n';
import { CodeBlock as AstryxCodeBlock } from '@astryxdesign/core/CodeBlock';

/** Renders a syntax-highlighted code block for docs and examples. */
export function CodeBlock({ children, language = 'text' }: { children: string; language?: string }) {
    const t = useTranslator();
    const showToast = useToast();

    return (
        <AstryxCodeBlock
            className="longlink-code-block"
            code={children.trim()}
            highlightMode="spans"
            language={language === 'text' ? 'plaintext' : language}
            width="100%"
            onCopy={() => showToast({ body: t('toasts.copiedToClipboard') })}
        />
    );
}
