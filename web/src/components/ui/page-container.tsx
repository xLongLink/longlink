import { cn } from 'cn';
import type { ComponentProps } from 'react';
import { Stack } from '@/components/longlink/layout/stack';

type PageContainerProps = Pick<
    ComponentProps<typeof Stack>,
    'children' | 'gap' | 'padding' | 'paddingInline' | 'justify'
> & { className?: string };

/** Centers Platform content without inheriting padding from its surrounding layout. */
export function PageContainer({ className, ...props }: PageContainerProps) {
    return (
        <Stack gap={0} {...props} className={cn('platform-page-container mx-auto w-full max-w-[1000px]', className)} />
    );
}
