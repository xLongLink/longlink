import type { ComponentProps, ElementType, ReactNode } from 'react';

type StylingProp =
    | 'className'
    | 'classNames'
    | 'style'
    | 'styles'
    | `${string}ClassName`
    | `${string}ClassNames`
    | `${string}Style`
    | `${string}Styles`
    | 'components'
    | 'dangerouslySetInnerHTML';

export type ViewProps<Props> = Props extends unknown ? Omit<Props, StylingProp> : never;

export type ViewComponent<Component extends ElementType> = (props: ViewProps<ComponentProps<Component>>) => ReactNode;

/** Excludes authored styling while retaining the identity required by compound components. */
export function viewComponent<Component extends ElementType>(component: Component): ViewComponent<Component> {
    // SAFETY: Only authored styling props are removed; the JSX boundary filters them without changing the implementation.
    return component as ViewComponent<Component>;
}

/** Removes styling overrides before authored JSX reaches an exposed component. */
export function viewProps<Props extends object>(props: Props): ViewProps<Props> {
    // SAFETY: The filter matches StylingProp and preserves every other prop without traversing application data.
    return Object.fromEntries(
        Object.entries(props).filter(
            ([name]) =>
                !/^(?:classNames?|styles?|components|dangerouslySetInnerHTML)$|(?:ClassNames?|Styles?)$/.test(name)
        )
    ) as ViewProps<Props>;
}
