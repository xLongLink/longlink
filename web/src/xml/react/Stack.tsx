import type { XmlComponentProps } from '@/xml';
import { evaluate, renderXml, useContext } from '@/xml';
const ALIGN_ITEMS = { center: 'center', end: 'flex-end', start: 'flex-start', stretch: 'stretch' } as const;
const JUSTIFY_CONTENT = { between: 'space-between', center: 'center', end: 'flex-end', start: 'flex-start' } as const;

function px(value: unknown, fallback: number) {
    if (typeof value === 'number') return `${value}px`;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) return /^\d+$/.test(trimmed) ? `${trimmed}px` : trimmed;
    }
    return `${fallback}px`;
}

/** Renders XML children in a configurable stack. */
export function Stack({ props: rawProps, children }: XmlComponentProps) {
    const { ctx } = useContext();
    const align = String(evaluate(rawProps.align ?? '', ctx) ?? 'stretch');
    const direction = String(evaluate(rawProps.direction ?? '', ctx) ?? 'column');
    const gap = evaluate(rawProps.gap ?? '', ctx) ?? 16;
    const justify = String(evaluate(rawProps.justify ?? '', ctx) ?? 'start');
    return (
        <div
            className={`flex ${direction === 'row' ? 'flex-row' : 'flex-col'}`}
            style={{
                gap: px(gap, 16),
                justifyContent: JUSTIFY_CONTENT[justify as keyof typeof JUSTIFY_CONTENT] ?? JUSTIFY_CONTENT.start,
                alignItems: ALIGN_ITEMS[align as keyof typeof ALIGN_ITEMS] ?? ALIGN_ITEMS.stretch,
            }}
        >
            {renderXml(children)}
        </div>
    );
}
