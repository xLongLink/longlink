import { Stack, type StackProps } from '@astryxdesign/core/Stack';

/** Renders a centered full-width Stack while clearing inherited container padding. */
export function PageContainer({ className, maxWidth = 1000, ...props }: Omit<StackProps, 'width'>) {
    const hasClassName = className !== undefined && className.length > 0;

    return (
        <Stack
            {...props}
            className={`mx-auto [--container-padding-block-end:var(--spacing-2)] [--container-padding-block-start:0px] [--container-padding-inline-end:0px] [--container-padding-inline-start:0px]${hasClassName ? ` ${className}` : ''}`}
            maxWidth={maxWidth}
            width="100%"
        />
    );
}
