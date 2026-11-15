import { textLanguage } from '@/lib/files';
import { Dialog } from '@/components/custom/native-dialog';
import { DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
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
        <Dialog fullscreen {...dialogProps}>
            <DialogContent className="flex h-[95dvh] w-[95dvw] max-w-[95dvw] flex-col sm:max-w-[95dvw]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="min-h-0 flex-1 overflow-auto">
                    <CodeBlock
                        code={text}
                        language={textLanguage(title) ?? 'plaintext'}
                        showLineNumbers
                        wrap
                        variant="ghost"
                    >
                        <CodeBlockCopyButton />
                    </CodeBlock>
                </div>
            </DialogContent>
        </Dialog>
    );
}
