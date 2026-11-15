import { textLanguage } from '@/lib/files';
import type { ComponentProps } from 'react';
import { FramedDialog } from '@/components/custom/framed-dialog';
import { CodeBlock, CodeBlockCopyButton } from '@/components/reui/code-block/code-block';

/** Displays text attachments with filename-based syntax highlighting, never executing their contents. */
export function TextPreview({
    text,
    title,
    ...dialogProps
}: Omit<ComponentProps<typeof FramedDialog>, 'children'> & { text: string; title: string }) {
    return (
        <FramedDialog title={title} variant="fullscreen" {...dialogProps}>
            <CodeBlock code={text} language={textLanguage(title) ?? 'plaintext'} showLineNumbers wrap variant="ghost">
                <CodeBlockCopyButton />
            </CodeBlock>
        </FramedDialog>
    );
}
