import { NativeText } from './NativeText';
import type { TextProps } from './typography';
import type { HTMLAttributes, Ref } from 'react';

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

const headings = { 1: 'h1', 2: 'h2', 3: 'h3', 4: 'h4', 5: 'h5', 6: 'h6' } as const;

/** Keeps visual heading size independent from the accessible document outline. */
export function NativeHeading({
    level,
    accessibilityLevel,
    type,
    className,
    ...props
}: Omit<HTMLAttributes<HTMLHeadingElement>, 'color'> &
    Pick<TextProps, 'color' | 'weight' | 'justify' | 'textWrap' | 'hasCapsize'> & {
        level: HeadingLevel;
        accessibilityLevel?: HeadingLevel;
        type?: 'display-1' | 'display-2' | 'display-3';
        ref?: Ref<HTMLHeadingElement>;
    }) {
    return (
        <NativeText
            {...props}
            as={headings[level]}
            aria-level={props['aria-level'] ?? (accessibilityLevel !== level ? accessibilityLevel : undefined)}
            type={type}
            display="block"
            data-level={level}
            className={className ? `native-heading ${className}` : 'native-heading'}
        />
    );
}
