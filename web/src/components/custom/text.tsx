import { NativeText } from './native-text';
import type { TextProps } from './typography';

/** Displays View text without exposing native DOM attributes to isolated Views. */
export function Text({
    children,
    type,
    color,
    size,
    weight,
    display,
    as,
    maxLines,
    hasTruncateTooltip,
    wordBreak,
    textWrap,
    justify,
    hasCapsize,
    hasStrikethrough,
    hasTabularNumbers
}: TextProps) {
    return (
        <NativeText
            type={type}
            color={color}
            size={size}
            weight={weight}
            display={display}
            as={as}
            maxLines={maxLines}
            hasTruncateTooltip={hasTruncateTooltip}
            wordBreak={wordBreak}
            textWrap={textWrap}
            justify={justify}
            hasCapsize={hasCapsize}
            hasStrikethrough={hasStrikethrough}
            hasTabularNumbers={hasTabularNumbers}
        >
            {children}
        </NativeText>
    );
}
