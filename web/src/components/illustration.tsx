import type { ComponentProps } from 'react';
import { useAppearance } from '@/lib/hooks/use-appearance';
import { useMediaQuery } from '@/lib/hooks/use-media-query';

/** Keeps white-on-transparent illustrations visible in the surrounding color mode. */
export function Illustration({ className, ...props }: ComponentProps<'img'>) {
    const { appearance } = useAppearance();
    const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
    const mode = appearance.theme === 'system' ? (prefersDark ? 'dark' : 'light') : appearance.theme;

    return <img {...props} className={`${className ?? ''}${mode === 'light' ? ' invert' : ''}`} />;
}
