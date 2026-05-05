import type { RenderableASTNode } from '@/xml';
import { renderNode, useRuntime } from '@/xml';
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

export function Stack({ align = 'stretch', children, direction = 'column', gap = 16, justify = 'start' }: StackProps) {
    const { ctx } = useRuntime();
    return (
        <div
            className={`flex ${direction === 'row' ? 'flex-row' : 'flex-col'}`}
            style={{
                gap: px(gap, 16),
                justifyContent: JUSTIFY_CONTENT[justify as keyof typeof JUSTIFY_CONTENT] ?? JUSTIFY_CONTENT.start,
                alignItems: ALIGN_ITEMS[align as keyof typeof ALIGN_ITEMS] ?? ALIGN_ITEMS.stretch,
            }}
        >
            {renderNode(children, ctx)}
        </div>
    );
}
