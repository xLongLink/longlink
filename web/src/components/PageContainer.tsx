import { Stack, type StackProps } from '@astryxdesign/core/Stack';

/** Renders a centered full-width Stack while clearing inherited container padding. */
export function PageContainer({ className, maxWidth = 1000, ...props }: Omit<StackProps, 'width'>) {
    return (
        <Stack
            {...props}
            className={`mx-auto [--container-padding-block-end:0px] [--container-padding-block-start:0px] [--container-padding-inline-end:0px] [--container-padding-inline-start:0px]${className ? ` ${className}` : ''}`}
            maxWidth={maxWidth}
            width="100%"
        />
    );
}
