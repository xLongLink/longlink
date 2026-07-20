import type { ReactNode } from 'react';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Center } from '@astryxdesign/core/Center';
import { Heading } from '@astryxdesign/core/Heading';
import Layout from '@/layout/Layout';

/** Renders the shared shell for standalone account authentication pages. */
export function AuthPage({
    children,
    description,
    title,
}: {
    children: ReactNode;
    description: string;
    title: string;
}) {
    return (
        <Layout brandOnly brandHref="/">
            <Center minHeight="60dvh" width="100%">
                <Stack gap={6} maxWidth={384} width="100%">
                    <Stack gap={2}>
                        <Heading justify="center" level={1}>
                            {title}
                        </Heading>
                        <Text as="p" color="secondary" justify="center" type="supporting">
                            {description}
                        </Text>
                    </Stack>
                    {children}
                </Stack>
            </Center>
        </Layout>
    );
}
