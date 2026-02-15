import {
    Children,
    isValidElement,
    type ReactElement,
    type ReactNode,
} from 'react';

type ColumnsProps = {
    width?: number;
    children?: ReactNode;
};

type WidthProps = {
    width?: number;
    props?: {
        width?: number;
    };
};

function toGridTemplate(widths: number[]) {
    if (widths.length === 0) {
        return '1fr';
    }

    const total = widths.reduce((sum, width) => sum + width, 0);

    if (total <= 0) {
        return `repeat(${widths.length}, minmax(0, 1fr))`;
    }

    return widths
        .map((width) => `minmax(0, ${(width / total) * 100}%)`)
        .join(' ');
}

export function Columns({ width, children }: ColumnsProps) {
    if (typeof width === 'number') {
        return <>{children}</>;
    }

    const columns = Children.toArray(children);
    const widths = columns.map((column) => {
        if (isValidElement(column)) {
            const columnElement = column as ReactElement<WidthProps>;

            if (typeof columnElement.props.width === 'number') {
                return columnElement.props.width;
            }

            if (typeof columnElement.props.props?.width === 'number') {
                return columnElement.props.props.width;
            }
        }

        return 1;
    });

    return (
        <div
            className="grid gap-4"
            style={{ gridTemplateColumns: toGridTemplate(widths) }}
        >
            {columns.map((column, index) => (
                <div key={`column-${index}`} className="space-y-4">
                    {column}
                </div>
            ))}
        </div>
    );
}

export default Columns;
