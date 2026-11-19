import { cn } from 'cn';
import type { ComponentProps } from 'react';
import { Stack } from '@/components/longlink/layout/stack';

type PageContainerProps = Pick<ComponentProps<typeof Stack>, 'children' | 'gap'> & { wide?: boolean; fill?: boolean };

/** Centers Platform content without inheriting padding from its surrounding layout. */
export function PageContainer({ wide, fill, ...props }: PageContainerProps) {
    return (
        <Stack
            gap={0}
            {...props}
            padding={2}
            className={cn(
                'platform-page-container mx-auto w-full',
                wide ? 'max-w-none' : 'max-w-[1000px]',
                fill && 'h-full min-h-0'
            )}
        />
    );
}
