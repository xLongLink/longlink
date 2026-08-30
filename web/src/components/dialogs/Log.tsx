import { Stack } from '@astryxdesign/core/Stack';
import { Banner } from '@astryxdesign/core/Banner';
import { Spinner } from '@astryxdesign/core/Spinner';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';

type LogDialogProps = {
    emptyMessage: string;
    error: Error | null;
    isFetching: boolean;
    logLines: readonly string[];
    onOpenChange: (open: boolean) => void;
    subtitle: string;
    title: string;
};

/** Renders a fetched log stream in a controlled dialog. */
export default function LogDialog({
    emptyMessage,
    error,
    isFetching,
    logLines,
    onOpenChange,
    subtitle,
    title,
}: LogDialogProps) {
    return (
        <Dialog isOpen onOpenChange={onOpenChange} width={768} maxHeight="85vh">
            <Layout
                header={<DialogHeader title={title} subtitle={subtitle} onOpenChange={onOpenChange} />}
                content={
                    <LayoutContent>
                        {isFetching ? (
                            <Stack align="center" padding={6}>
                                <Spinner />
                            </Stack>
                        ) : error ? (
                            <Banner status="error" title={error.message || 'Failed to load logs'} />
                        ) : (
                            <CodeBlock
                                code={logLines.length > 0 ? logLines.join('\n') : emptyMessage}
                                hasCopyButton={false}
                                hasLanguageLabel={false}
                                isWrapped
                                maxHeight="60vh"
                                size="sm"
                            />
                        )}
                    </LayoutContent>
                }
            />
        </Dialog>
    );
}
