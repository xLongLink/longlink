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

export type PublicProps<Props> = Props extends unknown ? Omit<Props, StylingProp> : never;

export type PublicComponent<Component extends ElementType> = (
    props: PublicProps<ComponentProps<Component>>
) => ReactNode;
