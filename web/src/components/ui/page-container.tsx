import type { ComponentProps } from 'react';
import { spacing } from '@/components/custom/layout';
import type { Stack } from '@/components/custom/stack';

type PageContainerProps = Pick<
    ComponentProps<typeof Stack>,
    'children' | 'height' | 'minHeight' | 'maxWidth' | 'gap' | 'padding' | 'paddingInline' | 'justify'
> & { className?: string };

/** Centers Platform content without inheriting padding from its surrounding layout. */
export function PageContainer({ className, maxWidth = 1000, ...props }: PageContainerProps) {
    const paddingInline = props.paddingInline ?? props.padding;

    return (
        <div
            className={`platform-page-container mx-auto flex w-full flex-col [--container-padding-block-end:calc(var(--spacing)*2)] [--container-padding-block-start:0px] [--container-padding-inline-end:0px] [--container-padding-inline-start:0px]${className ? ` ${className}` : ''}`}
            style={{
                height: props.height,
                minHeight: props.minHeight,
                maxWidth,
                gap: props.gap === undefined ? undefined : spacing(props.gap),
                paddingBlock: props.padding === undefined ? undefined : spacing(props.padding),
                paddingInline: paddingInline === undefined ? undefined : spacing(paddingInline),
                justifyContent: {
                    start: 'flex-start',
                    center: 'center',
                    end: 'flex-end',
                    between: 'space-between',
                    around: 'space-around',
                    evenly: 'space-evenly'
                }[props.justify ?? 'start']
            }}
        >
            {props.children}
        </div>
    );
}
