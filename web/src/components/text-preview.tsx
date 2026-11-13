import { textLanguage } from '@/lib/files';
import { Dialog } from '@/components/custom/dialog';
import { CodeBlock, CodeBlockCopyButton } from '@/components/reui/code-block/code-block';

/** Displays text attachments with filename-based syntax highlighting, never executing their contents. */
export function TextPreview({ text, title, onClose }: { text: string; title: string; onClose: () => void }) {
    return (
        <Dialog title={title} variant="fullscreen" isOpen onOpenChange={(open) => !open && onClose()}>
            <CodeBlock code={text} language={textLanguage(title) ?? 'plaintext'} showLineNumbers wrap variant="ghost">
                <CodeBlockCopyButton />
            </CodeBlock>
        </Dialog>
    );
}
