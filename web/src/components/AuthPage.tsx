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
    description: ReactNode;
    title: ReactNode;
}) {
    return (
        <Layout brandOnly brandHref="/" fillViewport reserveTabSpace>
            <Center height="100%" width="100%">
                <Stack gap={4} maxWidth={384} width="100%">
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
        </Layout>
    );
}
