import { Card } from '@astryxdesign/core/Card';
import { Stack } from '@astryxdesign/core/Stack';

/** Renders the decorative framed surface behind layout content. */
export function ContentFrame({
    className,
    isConnectedToHeader = false,
}: {
    className: string;
    isConnectedToHeader?: boolean;
}) {
    return (
        <>
            <Card
                aria-hidden="true"
                className={`pointer-events-none fixed z-0 overflow-clip ${isConnectedToHeader ? 'border-t-0' : ''} ${className}`}
                padding={0}
                variant="transparent"
            >
                <Stack
                    className={isConnectedToHeader ? 'px-2 pb-2' : undefined}
                    height="100%"
                    padding={isConnectedToHeader ? 0 : 2}
                >
                    <Card className="border-0 overflow-clip" height="100%" width="100%" />
                </Stack>
            </Card>
            <Card
                aria-hidden="true"
                className={`pointer-events-none fixed z-30 ${isConnectedToHeader ? 'border-x-8 border-b-8 border-t-0' : 'border-8'} border-body bg-transparent ${className}`}
                padding={0}
                variant="transparent"
            />
        </>
    );
}
