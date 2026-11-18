import { textLanguage } from '@/lib/files';
import { NativeFile } from '@/components/custom/native-file';
import { Dialog } from '@/components/longlink/layout/dialog';
import { CodeBlock, CodeBlockCopyButton } from '@/components/reui/code-block/code-block';

export type Preview = { title: string } & ({ type: 'file'; body: Blob } | { type: 'text'; text: string });

/** Displays host-fetched files or inert, syntax-highlighted text in one fullscreen dialog. */
export function PreviewDialog({ preview, onOpenChange }: { preview: Preview; onOpenChange: (open: boolean) => void }) {
    return (
        <Dialog open fullscreen onOpenChange={onOpenChange} title={preview.title}>
            {preview.type === 'file' ? (
                <div className="h-full min-h-0">
                    <NativeFile body={preview.body} title={preview.title} />
                </div>
            ) : (
                <CodeBlock
                    code={preview.text}
                    language={textLanguage(preview.title) ?? 'plaintext'}
                    showLineNumbers
                    wrap
                    variant="ghost"
                >
                    <CodeBlockCopyButton />
                </CodeBlock>
            )}
        </Dialog>
    );
}
