import { z } from 'zod';
import type { ReactNode } from 'react';
import { Text } from '@/components/astryx/Text';
import { Stack } from '@/components/astryx/Stack';
import { Center } from '@/components/astryx/Center';
import { Heading } from '@/components/astryx/Heading';

/** Renders the shared standalone account page frame. */
export function AuthLayout({
    children,
    description,
    title,
}: {
    children: ReactNode;
    description: ReactNode;
    title: ReactNode;
}) {
    // Only plain text needs typography; authored elements keep their own presentation.
    const descriptionText = z.string().safeParse(description);

    return (
        <Center minHeight="calc(100dvh - var(--_app-shell-header-height, 0px) - var(--spacing-4))" width="100%">
            <Stack gap={description === null ? 2 : 4} maxWidth={384} paddingBlock={8} paddingInline={4} width="100%">
                <Stack gap={1}>
                    <Heading justify="center" level={1}>
                        {title}
                    </Heading>
                    {descriptionText.success ? (
                        <Text as="p" justify="center" type="supporting">
                            {descriptionText.data}
                        </Text>
                    ) : (
                        description
                    )}
                </Stack>
                {children}
            </Stack>
        </Center>
    );
}
