import type { MouseEvent, ReactNode } from 'react';
import { Card as AstryxCard } from '@astryxdesign/core/Card';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import { SelectableCard } from '@astryxdesign/core/SelectableCard';

type CardProps = {
    children?: ReactNode;
    padding?: 0 | 0.5 | 1 | 1.5 | 2 | 3 | 4 | 5 | 6 | 8 | 10;
    variant?:
        | 'default'
        | 'transparent'
        | 'muted'
        | 'blue'
        | 'cyan'
        | 'gray'
        | 'green'
        | 'orange'
        | 'pink'
        | 'purple'
        | 'red'
        | 'teal'
        | 'yellow';
    width?: number | string;
    height?: number | string;
    maxWidth?: number | string;
    minHeight?: number | string;
    id?: string;
    inert?: boolean;
    'aria-hidden'?: boolean | 'true' | 'false';
    label?: string;
    onClick?: (event: MouseEvent<HTMLElement>) => void;
    href?: string;
    target?: string;
    isDisabled?: boolean;
    isSelected?: boolean;
    onChange?: (isSelected: boolean) => void;
};

/** Infers the Astryx card from one shared set of props, giving selection priority over activation. */
export function Card({
    label = 'Card',
    padding = 4,
    variant = 'default',
    onClick,
    href,
    target = '_self',
    isDisabled = false,
    isSelected = false,
    onChange,
    ...props
}: CardProps) {
    // Use Astryx's controlled selection behavior whenever a selection callback is supplied.
    if (onChange !== undefined) {
        return (
            <SelectableCard
                {...props}
                padding={padding}
                variant={variant}
                label={label}
                isSelected={isSelected}
                onChange={onChange}
                isDisabled={isDisabled}
            />
        );
    }

    // Delegate actions and navigation to Astryx's clickable card.
    if (onClick !== undefined || href !== undefined) {
        return (
            <ClickableCard
                {...props}
                padding={padding}
                variant={variant}
                label={label}
                onClick={onClick}
                href={href}
                target={target}
                isDisabled={isDisabled}
            />
        );
    }

    // Keep content-only cards non-interactive.
    return <AstryxCard {...props} padding={padding} variant={variant} />;
}
