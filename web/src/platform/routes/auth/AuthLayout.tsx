import type { ReactNode } from 'react';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Center } from '@astryxdesign/core/Center';
import { Heading } from '@astryxdesign/core/Heading';

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
    return (
        <Center minHeight="calc(100dvh - var(--appshell-header-height, 0px))" width="100%">
            <Stack gap={4} maxWidth={384} paddingBlock={8} paddingInline={4} width="100%">
                <Stack gap={1}>
                    <Heading justify="center" level={1}>
                        {title}
                    </Heading>
                    {typeof description === 'string' ? (
                        <Text as="p" color="secondary" justify="center" type="supporting">
                            {description}
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
