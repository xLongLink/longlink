import { TypographyTooltip } from './TypographyTooltip';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Displays View text with semantic typography and optional truncation details. */
export function Text({
    children,
    type = 'body',
    color = type === 'supporting' ? 'secondary' : type === 'inherit' ? 'inherit' : 'primary',
    size,
    weight,
    display = 'inline',
    as: Component = 'span',
    maxLines = 0,
    hasTruncateTooltip = true,
    wordBreak = maxLines === 1 ? 'break-all' : 'break-word',
    textWrap,
    justify = 'start',
    hasCapsize = false,
    hasStrikethrough = false,
    hasTabularNumbers = false,
}: {
    children?: ReactNode;
    color?: 'primary' | 'secondary' | 'disabled' | 'placeholder' | 'accent' | 'inherit';
    type?: 'body' | 'large' | 'label' | 'supporting' | 'code' | 'display-1' | 'display-2' | 'display-3' | 'inherit';
    size?: '4xs' | '3xs' | '2xs' | 'xsm' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
    weight?: 'normal' | 'medium' | 'semibold' | 'bold';
    display?: 'inline' | 'block';
    as?: 'span' | 'p' | 'div' | 'label' | 'h1' | 'h2' | 'h3';
    maxLines?: number;
    hasTruncateTooltip?: boolean | 'above' | 'below' | 'start' | 'end';
    wordBreak?: 'break-word' | 'break-all';
    textWrap?: 'wrap' | 'nowrap' | 'balance' | 'pretty';
    justify?: 'start' | 'center' | 'end';
    hasCapsize?: boolean;
    hasStrikethrough?: boolean;
    hasTabularNumbers?: boolean;
}) {
    const elementRef = useRef<HTMLElement | null>(null);
    const [overflow, setOverflow] = useState({ truncated: false, text: '' });

    // Keep truncation details current when either the available space or the text changes.
    useEffect(() => {
        const element = elementRef.current;

        if (!element || maxLines <= 0 || hasTruncateTooltip === false) return;

        const measure = () => {
            let contentHeight = element.scrollHeight;

            if (maxLines > 1) {
                const range = element.ownerDocument.createRange();
                range.selectNodeContents(element);

                if ('getBoundingClientRect' in range) {
                    contentHeight = range.getBoundingClientRect().height;
                }

                range.detach();
            }

            const truncated =
                maxLines === 1 ? element.scrollWidth > element.offsetWidth : contentHeight > element.offsetHeight;

            const text = element.textContent ?? '';
            setOverflow((previous) =>
                previous.truncated === truncated && previous.text === text ? previous : { truncated, text }
            );
        };

        measure();
        const resizeObserver = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
        resizeObserver?.observe(element);
        const mutationObserver = new MutationObserver(measure);
        mutationObserver.observe(element, { childList: true, characterData: true, subtree: true });

        return () => {
            resizeObserver?.disconnect();
            mutationObserver.disconnect();
        };
    }, [maxLines, hasTruncateTooltip, Component]);

    // Preserve single-line clipping and the capsize override of multi-line display.
    const content = (
        <Component
            ref={(element: HTMLElement | null) => {
                elementRef.current = element;
            }}
            className="view-text"
            data-type={type}
            data-color={color}
            data-size={size}
            data-weight={weight}
            data-display={maxLines > 0 || hasCapsize ? 'block' : display}
            data-clamp={maxLines === 1 ? 'single' : maxLines > 1 ? 'multiple' : undefined}
            data-word-break={maxLines > 0 ? wordBreak : undefined}
            data-text-wrap={textWrap}
            data-justify={justify === 'start' ? undefined : justify}
            data-capsize={hasCapsize || undefined}
            data-strikethrough={hasStrikethrough || undefined}
            data-tabular={hasTabularNumbers || undefined}
            style={maxLines > 1 ? { WebkitLineClamp: maxLines } : undefined}
        >
            {children}
        </Component>
    );

    return (
        <TypographyTooltip
            enabled={maxLines > 0 && hasTruncateTooltip !== false && overflow.truncated}
            content={overflow.text}
            placement={hasTruncateTooltip === true || hasTruncateTooltip === false ? 'above' : hasTruncateTooltip}
        >
            {content}
        </TypographyTooltip>
    );
}
