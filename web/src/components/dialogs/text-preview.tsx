import { textLanguage } from '@/lib/files';
import { Dialog } from '@/components/longlink/layout/dialog';
import { CodeBlock, CodeBlockCopyButton } from '@/components/reui/code-block/code-block';

/** Displays text attachments with filename-based syntax highlighting, never executing their contents. */
export function TextPreview({
    text,
    title,
    ...dialogProps
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    text: string;
    title: string;
}) {
    return (
        <Dialog fullscreen {...dialogProps} title={title}>
            <CodeBlock code={text} language={textLanguage(title) ?? 'plaintext'} showLineNumbers wrap variant="ghost">
                <CodeBlockCopyButton />
            </CodeBlock>
        </Dialog>
    );
}
