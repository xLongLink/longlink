import { Stack, type StackProps } from '@astryxdesign/core/Stack';

type PageContainerProps = Omit<StackProps, 'width'>;

const CONTAINER_CLASS_NAME =
    'mx-auto [--container-padding-block-end:0px] [--container-padding-block-start:0px] [--container-padding-inline-end:0px] [--container-padding-inline-start:0px]';

/** Renders a centered full-width Stack while clearing inherited container padding. */
export function PageContainer({ className, maxWidth = 1000, ...props }: PageContainerProps) {
    return (
        <Stack
            {...props}
            className={`${CONTAINER_CLASS_NAME}${className ? ` ${className}` : ''}`}
            maxWidth={maxWidth}
            width="100%"
        />
    );
}
