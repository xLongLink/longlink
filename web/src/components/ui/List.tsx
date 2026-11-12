import type { ReactNode } from 'react';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { List as AstryxList, ListItem as AstryxListItem } from '@astryxdesign/core/List';

/** Displays named, read-only rows aligned with their containing card or section. */
export function List({
    label,
    children,
    edge = 'flush',
    ...props
}: {
    label: string;
    children?: ReactNode;
    density?: 'compact' | 'balanced' | 'spacious';
    hasDividers?: boolean;
    edge?: 'flush' | 'outset';
}) {
    // Outset rows keep text aligned while reserving space inside their interaction backgrounds.
    return (
        <AstryxList
            {...props}
            aria-label={label}
            edge={edge === 'outset' ? 'padded' : 'flush'}
            density={props.density ?? 'balanced'}
            className={
                edge === 'outset'
                    ? props.density === 'spacious'
                        ? '-mx-(--spacing-3)'
                        : '-mx-(--spacing-2)'
                    : undefined
            }
        >
            {children}
        </AstryxList>
    );
}

/** Displays wrapping rows with optional leading, trailing, and selection controls. */
export function ListItem({
    label,
    description,
    color,
    align = 'first-line',
    markerColor,
    startContent,
    ...props
}: {
    label: string;
    description?: string;
    color?: 'primary' | 'secondary';
    align?: 'center' | 'first-line';
    markerColor?: 'blue' | 'purple' | 'green' | 'orange' | 'pink';
    onClick?: () => void;
    isSelected?: boolean;
    startContent?: ReactNode;
    endContent?: ReactNode;
}) {
    // ReactNode labels preserve the complete text instead of Astryx's string truncation default.
    const markerColors = {
        blue: 'bg-(--color-series-blue)',
        purple: 'bg-(--color-series-purple)',
        green: 'bg-(--color-series-green)',
        orange: 'bg-(--color-series-orange)',
        pink: 'bg-(--color-series-pink)',
    };

    return (
        <AstryxListItem
            {...props}
            align={align}
            startContent={
                markerColor ? (
                    <Stack direction="horizontal" align="center" gap={3}>
                        <Stack
                            aria-hidden="true"
                            className={`size-2 shrink-0 rounded-full ${markerColors[markerColor]}`}
                        />
                        {startContent}
                    </Stack>
                ) : (
                    startContent
                )
            }
            label={
                <Text color={color} wordBreak="break-word">
                    {label}
                </Text>
            }
            description={
                description ? (
                    <Text color="secondary" wordBreak="break-word">
                        {description}
                    </Text>
                ) : undefined
            }
        />
    );
}
