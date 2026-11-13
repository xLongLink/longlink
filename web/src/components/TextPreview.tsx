import { textLanguage } from '@/lib/files';
import { ViewDialog } from '@/components/ui/ViewDialog';
import { NativeCodeBlock as CodeBlock } from '@/components/ui/NativeCodeBlock';

/** Displays text attachments with filename-based syntax highlighting, never executing their contents. */
export function TextPreview({ text, title, onClose }: { text: string; title: string; onClose: () => void }) {
    return (
        <ViewDialog title={title} variant="fullscreen" isOpen onOpenChange={(open) => !open && onClose()}>
            <CodeBlock
                code={text}
                language={textLanguage(title) ?? 'plaintext'}
                hasLineNumbers
                isWrapped
                width="100%"
                container="section"
            />
        </ViewDialog>
    );
}
