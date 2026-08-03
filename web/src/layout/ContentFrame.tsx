import { Card } from '@astryxdesign/core/Card';
import { Stack } from '@astryxdesign/core/Stack';

/** Renders the decorative framed surface behind layout content. */
export function ContentFrame({ className }: { className: string }) {
    return (
        <>
            <Card
                aria-hidden="true"
                className={`pointer-events-none fixed z-0 overflow-clip ${className}`}
                padding={0}
                variant="transparent"
            >
                <Stack height="100%" padding={2}>
                    <Card className="border-0 overflow-clip" height="100%" width="100%" />
                </Stack>
            </Card>
            <Card
                aria-hidden="true"
                className={`pointer-events-none fixed z-30 border-8 border-body bg-transparent ${className}`}
                padding={0}
                variant="transparent"
            />
        </>
    );
}
