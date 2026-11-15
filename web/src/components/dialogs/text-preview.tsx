import { textLanguage } from '@/lib/files';
import { Dialog, type DialogProps } from '@/components/custom/dialog';
import { CodeBlock, CodeBlockCopyButton } from '@/components/reui/code-block/code-block';

/** Displays text attachments with filename-based syntax highlighting, never executing their contents. */
export function TextPreview({ text, title, ...dialogProps }: DialogProps & { text: string; title: string }) {
    return (
        <Dialog title={title} variant="fullscreen" {...dialogProps}>
            <CodeBlock code={text} language={textLanguage(title) ?? 'plaintext'} showLineNumbers wrap variant="ghost">
                <CodeBlockCopyButton />
            </CodeBlock>
        </Dialog>
    );
}
