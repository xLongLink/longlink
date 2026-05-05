import type { XmlComponentProps } from '@/xml';
import { renderXml } from '@/xml';
import { Icon } from './Icon';

export function Hero({ props, children }: XmlComponentProps) {
    const title = String(props.title ?? '');
    const subtitle = String(props.subtitle ?? '');
    const icon = String(props.icon ?? '');
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
            {children ? <div className="shrink-0">{renderXml(children)}</div> : null}
        </div>
    );
}
