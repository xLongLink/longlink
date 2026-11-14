import type { ComponentProps } from 'react';

/** Keeps white-on-transparent illustrations visible in the surrounding color mode. */
export function Illustration({ className, ...props }: ComponentProps<'img'>) {
    return <img {...props} className={`${className ?? ''} invert dark:invert-0`} />;
}
