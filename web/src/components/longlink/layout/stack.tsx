import { cn } from 'cn';
import { spacing } from './spacing';
import { createElement, useCallback, useState, type HTMLAttributes, type ReactElement, type ReactNode } from 'react';

type StackProps = Omit<HTMLAttributes<HTMLElement>, 'style'> & {
    as?: 'div' | 'main' | 'section' | 'aside' | 'figure' | 'footer';
    direction?: 'horizontal' | 'vertical';
    justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
    align?: 'start' | 'center' | 'end' | 'stretch';
    wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
    gap?: number;
    padding?: number;
    paddingInline?: number;
    paddingBlock?: number;
    background?: 'muted';
};

/** Arranges content with a three-step default gap and explicit layout controls. */
export function Stack({
    as: Component = 'div',
    direction = 'vertical',
    justify,
    align,
    wrap,
    gap,
    padding,
    paddingInline = padding,
    paddingBlock = padding,
    background,
    className,
    children,
    ...props
}: StackProps): ReactElement {
    // Keep omitted spacing in CSS so caller utility classes can override the defaults.
    return createElement(
        Component,
        {
            'data-slot': 'stack',
            ...props,
            className: cn(
                'flex gap-3',
                direction === 'horizontal' ? 'flex-row' : 'flex-col',
                justify &&
                    {
                        start: 'justify-start',
                        center: 'justify-center',
                        end: 'justify-end',
                        between: 'justify-between',
                        around: 'justify-around',
                        evenly: 'justify-evenly'
                    }[justify],
                align &&
                    { start: 'items-start', center: 'items-center', end: 'items-end', stretch: 'items-stretch' }[align],
                background === 'muted' && 'bg-muted',
                className
            ),
            style: {
                gap: spacing(gap),
                paddingInline: spacing(paddingInline),
                paddingBlock: spacing(paddingBlock),
                flexWrap: wrap
            }
        },
        children
    );
}

/** Controls how one item participates in its surrounding Stack. */
export function StackItem(props: {
    /** Content rendered inside the stack item. */
    children?: ReactNode;
    size?: 'static' | 'fill';
    isScrollable?: boolean;
    /** Overrides this item's cross-axis alignment; omitted values inherit the parent alignment. */
    crossAlignSelf?: 'start' | 'center' | 'end' | 'stretch';
}) {
    const [overflows, setOverflows] = useState(false);

    // Name scroll regions only while overflowing, including changes within retained children.
    const ref = useCallback(
        (element: HTMLDivElement | null) => {
            if (!element || !props.isScrollable) return;

            const lifetime = new AbortController();

            const measure = () => {
                if (lifetime.signal.aborted || !element.clientWidth || !element.clientHeight) return;

                setOverflows(
                    element.scrollHeight - element.clientHeight > 1 || element.scrollWidth - element.clientWidth > 1
                );
            };

            const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);

            const observeChildren = () => {
                resize?.disconnect();
                resize?.observe(element);

                for (const child of element.children) resize?.observe(child);

                measure();
            };

            const mutations = new MutationObserver(observeChildren);
            mutations.observe(element, {
                childList: true,
                subtree: true,
                characterData: true,
                attributes: true,
                attributeFilter: ['class', 'dir', 'hidden', 'style']
            });
            observeChildren();
            const { signal } = lifetime;
            window.addEventListener('resize', measure, { signal });
            window.visualViewport?.addEventListener('resize', measure, { signal });
            element.addEventListener('load', measure, { capture: true, signal });
            element.addEventListener('transitionend', measure, { signal });
            element.addEventListener('animationend', measure, { signal });
            document.fonts?.addEventListener?.('loadingdone', measure, { signal });
            void document.fonts?.ready.then(measure);

            return () => {
                lifetime.abort();
                resize?.disconnect();
                mutations.disconnect();
            };
        },
        [props.isScrollable]
    );

    // Preserve intrinsic flex bases: fill grows without forcing an equal zero basis.
    return (
        <div
            data-slot="stack-item"
            ref={ref}
            className="view-stack-item min-h-0 min-w-0"
            role={props.isScrollable && overflows ? 'group' : undefined}
            aria-label={props.isScrollable && overflows ? 'Content' : undefined}
            style={{
                flexGrow: props.size === 'fill' ? 1 : 0,
                flexShrink: props.size === 'fill' ? undefined : 0,
                overflow: props.isScrollable ? 'auto' : undefined,
                alignSelf:
                    props.crossAlignSelf === 'start'
                        ? 'flex-start'
                        : props.crossAlignSelf === 'end'
                          ? 'flex-end'
                          : props.crossAlignSelf
            }}
        >
            {props.children}
        </div>
    );
}
