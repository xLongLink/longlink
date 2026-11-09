import { textLanguage } from '@/lib/files';
import { Dialog } from '@/components/ui/Dialog';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';

/** Displays text attachments with filename-based syntax highlighting, never executing their contents. */
export function TextPreview({ text, title, onClose }: { text: string; title: string; onClose: () => void }) {
    return (
        <Dialog title={title} variant="fullscreen" isOpen onOpenChange={(open) => !open && onClose()}>
            <CodeBlock
                code={text}
                language={textLanguage(title) ?? 'plaintext'}
                hasLineNumbers
                isWrapped
                width="100%"
                container="section"
            />
        </Dialog>
    );
}
