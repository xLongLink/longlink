import type { RenderableASTNode } from '@/xml';
import { evaluate, renderNode, useContext } from '@/xml';
import { Icon } from './Icon';

export function Hero({ props, children }: { props: Record<string, string>; children?: RenderableASTNode }) {
    const context = useContext();
    const title = evaluate(props.title ?? '', context, 'string');
    const subtitle = evaluate(props.subtitle ?? '', context, 'string');
    const icon = evaluate(props.icon ?? '', context, 'string');
    return (
        <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
                {icon ? (
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border">
                        <Icon name={icon} />
                    </div>
                ) : null}
                <div>
                    <h2 className="text-lg font-semibold text-white">{title}</h2>
                    {subtitle ? <p className="text-sm text-white/60">{subtitle}</p> : null}
                </div>
            </div>
            {children ? <div className="shrink-0">{renderNode(children, context.ctx)}</div> : null}
        </div>
    );
}
