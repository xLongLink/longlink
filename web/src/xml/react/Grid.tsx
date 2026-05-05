import type { XmlComponentProps } from '@/xml';
import { evaluate, renderXml, useContext } from '@/xml';

/** Renders XML children in a CSS grid. */
export function Grid({ props: rawProps, children }: XmlComponentProps) {
    const { ctx } = useContext();
    const gap = String(evaluate(rawProps.gap ?? '', ctx) ?? '1rem');
    const columns = String(evaluate(rawProps.columns ?? '', ctx) ?? '');
    const align = String(evaluate(rawProps.align ?? '', ctx) ?? '');
    const justify = String(evaluate(rawProps.justify ?? '', ctx) ?? '');
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
            {renderXml(children)}
        </div>
    );
}
