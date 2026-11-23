import type { ReactNode } from 'react';
import { Text } from '@/components/longlink/display/text';
import { Stack } from '@/components/longlink/layout/stack';
import { Heading } from '@/components/longlink/display/heading';

/** Renders the shared standalone account page frame. */
export function AuthLayout({
    children,
    description,
    title,
    headingSize = 1
}: {
    children: ReactNode;
    description: string | null;
    title: ReactNode;
    headingSize?: 1 | 3;
}) {
    return (
        <Stack
            direction="horizontal"
            gap={0}
            align="center"
            justify="center"
            className="min-h-(--surface-content-height) w-full"
        >
            <Stack
                gap={description === null ? 2 : 4}
                paddingInline={4}
                paddingBlock={8}
                className="box-border w-full max-w-96"
            >
                <Stack gap={1} className="font-sans wrap-anywhere text-foreground">
                    <Heading level={1} size={headingSize} align="center">
                        {title}
                    </Heading>
                    {description !== null && (
                        <Text as="p" size="sm" weight="normal" tone="muted" align="center">
                            {description}
                        </Text>
                    )}
                </Stack>
                {children}
            </Stack>
        </Stack>
    );
}
