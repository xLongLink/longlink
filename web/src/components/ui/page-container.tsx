import type { ComponentProps } from 'react';
import { NativeStack } from '@/components/custom/native-stack';

type PageContainerProps = Pick<
    ComponentProps<typeof NativeStack>,
    'children' | 'height' | 'minHeight' | 'maxWidth' | 'gap' | 'padding' | 'paddingInline' | 'justify'
> & { className?: string };

/** Centers Platform content without inheriting padding from its surrounding layout. */
export function PageContainer({ className, maxWidth = 1000, ...props }: PageContainerProps) {
    return (
        <NativeStack
            {...props}
            maxWidth={maxWidth}
            className={`platform-page-container mx-auto w-full [--container-padding-block-end:calc(var(--spacing)*2)] [--container-padding-block-start:0px] [--container-padding-inline-end:0px] [--container-padding-inline-start:0px]${className ? ` ${className}` : ''}`}
        />
    );
}
