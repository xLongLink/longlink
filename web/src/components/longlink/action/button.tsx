import type { ComponentProps } from 'react';
import { Button as NativeButton } from '@/components/shadcn/button';

/** Displays a button with component-owned styling. */
export function Button(props: Omit<ComponentProps<typeof NativeButton>, 'className'>) {
    return <NativeButton {...props} className={undefined} />;
}

export { buttonVariants } from '@/components/shadcn/button';
