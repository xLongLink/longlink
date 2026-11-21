import type { ReactNode } from 'react';
import { Text } from '@/components/longlink/display/text';
import { Heading } from '@/components/longlink/display/heading';

/** Renders the shared standalone account page frame. */
export function AuthLayout({
    children,
    description,
    title,
    headingSize = 1
}: {
    children: ReactNode;
    description: ReactNode;
    title: ReactNode;
    headingSize?: 1 | 3;
}) {
    return (
        <div className="flex min-h-(--surface-content-height) w-full items-center justify-center">
            <div
                className="box-border flex w-full max-w-96 flex-col gap-4 px-4 py-8 data-[description=none]:gap-2"
                data-description={description === null ? 'none' : undefined}
            >
                <div className="flex flex-col gap-1 font-sans wrap-anywhere text-foreground">
                    <Heading level={1} size={headingSize} align="center">
                        {title}
                    </Heading>
                    {typeof description === 'string' ? (
                        <Text as="p" size="sm" weight="normal" tone="muted" align="center">
                            {description}
                        </Text>
                    ) : (
                        description
                    )}
                </div>
                {children}
            </div>
        </div>
    );
}
