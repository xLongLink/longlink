import type { MouseEvent, ReactNode } from 'react';
import { Card as AstryxCard } from '@astryxdesign/core/Card';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import { SelectableCard } from '@astryxdesign/core/SelectableCard';

type CardProps = {
    /** Content rendered inside the card. */
    children?: ReactNode;
    /** Inner spacing using the theme spacing scale. */
    padding?: 0 | 0.5 | 1 | 1.5 | 2 | 3 | 4 | 5 | 6 | 8 | 10;
    /** Background color variant, independent of the interaction mode. */
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
    /** Card width; numbers are pixels and strings are CSS sizes. */
    width?: number | string;
    /** Card height; numbers are pixels and strings are CSS sizes. */
    height?: number | string;
    /** Maximum card width. */
    maxWidth?: number | string;
    /** Minimum card height. */
    minHeight?: number | string;
    /** Makes the card and its descendants non-interactive. */
    inert?: boolean;
    /** Hides the card from assistive technologies. */
    'aria-hidden'?: boolean | 'true' | 'false';
    /** Accessible label for interactive cards; supply a descriptive label. */
    label?: string;
    /** Makes the card clickable when its surface is activated; nested controls act independently. */
    onClick?: (event: MouseEvent<HTMLElement>) => void;
    /** Makes the card a navigation target when no selection callback is supplied. */
    href?: string;
    /** Link target, such as _blank. */
    target?: string;
    /** Disables activation of an interactive card. */
    isDisabled?: boolean;
    /** Selection state; supply onChange to let users toggle it. */
    isSelected?: boolean;
    /** Makes the card selectable and receives its next selection state; takes priority over onClick and href. */
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
