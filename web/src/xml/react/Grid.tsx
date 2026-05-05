import type { XmlComponentProps } from '@/xml';
import { renderNode, useContext } from '@/xml';

/** Renders XML children in a CSS grid. */
export function Grid({ props, children }: XmlComponentProps) {
    const context = useContext();
    const gap = String(props.gap ?? '1rem');
    const columns = String(props.columns ?? '');
    const align = String(props.align ?? '');
    const justify = String(props.justify ?? '');
    return (
        <div
            style={{
                display: 'grid',
                gap,
                gridTemplateColumns: columns,
                alignItems: align,
                justifyItems: justify,
            }}
        >
            {renderNode(children, context.ctx)}
        </div>
    );
}
