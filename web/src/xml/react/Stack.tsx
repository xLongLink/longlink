import type { RenderableASTNode } from '@/xml';
import { evaluate, renderNode, useContext } from '@/xml';
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

type StackProps = {
    align?: string;
    children?: RenderableASTNode;
    direction?: string;
    gap?: number | string;
    justify?: string;
};

export function Stack({ props, children }: { props: Record<string, string>; children?: RenderableASTNode }) {
    const context = useContext();
    const align = evaluate(props.align ?? 'stretch', context, 'string');
    const direction = evaluate(props.direction ?? 'column', context, 'string');
    const gap = evaluate(props.gap ?? '16', context);
    const justify = evaluate(props.justify ?? 'start', context, 'string');
    return (
        <div
            className={`flex ${direction === 'row' ? 'flex-row' : 'flex-col'}`}
            style={{
                gap: px(gap, 16),
                justifyContent: JUSTIFY_CONTENT[justify as keyof typeof JUSTIFY_CONTENT] ?? JUSTIFY_CONTENT.start,
                alignItems: ALIGN_ITEMS[align as keyof typeof ALIGN_ITEMS] ?? ALIGN_ITEMS.stretch,
            }}
        >
            {renderNode(children, context.ctx)}
        </div>
    );
}
