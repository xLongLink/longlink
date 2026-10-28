import type { ComponentProps } from 'react';
import { useTheme } from '@astryxdesign/core/theme';

/** Keeps white-on-transparent illustrations visible in the surrounding color mode. */
export function Illustration({ className, ...props }: ComponentProps<'img'>) {
    const { mode } = useTheme();

    return <img {...props} className={`${className ?? ''}${mode === 'light' ? ' invert' : ''}`} />;
}
