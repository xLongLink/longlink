import type { ReactNode } from 'react';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Center } from '@astryxdesign/core/Center';
import { Heading } from '@astryxdesign/core/Heading';

type AuthFormProps = {
    children: ReactNode;
    gap: 2 | 3 | 4;
    onSubmit: () => void | Promise<unknown>;
};

/** Renders a token-spaced authentication form with native navigation disabled. */
export function AuthForm({ children, gap, onSubmit }: AuthFormProps) {
    return (
        <Stack
            as="form"
            gap={gap}
            onSubmit={(event) => {
                event.preventDefault();
                void onSubmit();
            }}
        >
            {children}
        </Stack>
    );
}

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
        <Center minHeight="calc(100dvh - var(--_app-shell-header-height, 0px) - var(--spacing-4))" width="100%">
            <Stack gap={description === null ? 2 : 4} maxWidth={384} paddingBlock={8} paddingInline={4} width="100%">
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
