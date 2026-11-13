import { Icon, type StoneIconName } from './Icon';
import { Children, useId, useState, type ReactNode } from 'react';

/** Lists labeled values with optional truncation and label placement. */
export function MetadataList({
    children,
    columns = 'single',
    title,
    label,
    maxNumOfItems,
    orientation = 'vertical',
}: {
    children?: ReactNode;
    columns?: 'multi' | 'single' | number;
    title?: ReactNode;
    label?: { position: 'start' | 'top'; width?: number | string };
    maxNumOfItems?: number;
    orientation?: 'vertical' | 'horizontal';
}) {
    const [expanded, setExpanded] = useState(false);
    const contentId = useId();
    const items = Children.toArray(children);
    const horizontal = orientation === 'horizontal';
    const fixedColumns = columns !== 'single' && columns !== 'multi' ? columns : undefined;
    const multiple = columns === 'multi' || (fixedColumns != null && fixedColumns > 1);
    const position = horizontal ? 'top' : (label?.position ?? (multiple ? 'top' : 'start'));
    const limited = !horizontal && maxNumOfItems != null && items.length > maxNumOfItems;

    // Preserve fixed column tracks and side-label widths without affecting horizontal flow.
    let gridTemplateColumns: string | undefined;

    if (!horizontal) {
        if (fixedColumns != null && fixedColumns > 1) {
            gridTemplateColumns = `repeat(${fixedColumns}, ${position === 'top' ? '1fr' : 'auto minmax(0, 1fr)'})`;
        } else if (position === 'start' && label?.width != null) {
            // oxlint-disable-next-line anti-slop/no-runtime-typeof -- The public width contract accepts pixels or a CSS size.
            const width = typeof label.width === 'number' ? `${label.width}px` : label.width;
            gridTemplateColumns = `${width} minmax(0, 1fr)`;
        }
    }

    // Keep the toggle tied to the definition list and retain expansion across content updates.
    return (
        <div
            className="view-metadata"
            data-orientation={orientation}
            data-position={position}
            data-multiple={columns !== 'single' && columns !== 1}
        >
            {title !== null && title !== undefined && title !== true && title !== false && title !== '' && (
                <div className="view-metadata-title">{title}</div>
            )}
            <dl id={contentId} className="view-metadata-list" style={{ gridTemplateColumns }}>
                {limited && !expanded ? items.slice(0, maxNumOfItems) : items}
            </dl>
            {limited && (
                <button
                    type="button"
                    className="view-metadata-toggle"
                    aria-controls={contentId}
                    aria-expanded={expanded}
                    onClick={() => setExpanded((value) => !value)}
                >
                    {expanded ? 'Show less' : 'Show more'}
                </button>
            )}
        </div>
    );
}

/** Displays one labeled value inside a MetadataList. */
export function MetadataListItem({
    children,
    label,
    icon,
}: {
    /** Value rendered beside the metadata label. */
    children?: ReactNode;
    /** Label identifying the metadata value. */
    label: string;
    /** Optional icon displayed beside the metadata label. */
    icon?: StoneIconName;
}) {
    // Resolve the registered icon name without changing the metadata content.
    return (
        <div className="view-metadata-item">
            <dt>
                {icon && (
                    <span className="view-metadata-icon">
                        <Icon icon={icon} size="sm" />
                    </span>
                )}
                {label}
            </dt>
            <dd>{children}</dd>
        </div>
    );
}
