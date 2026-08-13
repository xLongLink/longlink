import { Card as AstryxCard } from '@astryxdesign/core-0-3/Card';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { isXmlEnum, resolveXml } from '../core/props';
import { CARD_VARIANTS, ELEVATIONS, SPACINGS } from '../constants';

/**
 * checked: false
 * https://astryx.atmeta.com/components/Card?tab=properties
 * - width: str | int
 * - height: str | int
 * - maxWidth: str | int
 * - minHeight: str | int
 * - padding: int | float
 * - variant: str
 * - elevation: str
 * - children: ReactNode
 */
export function Card({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const width = resolveXml(props, 'width', ctx);
    const height = resolveXml(props, 'height', ctx);
    const padding = resolveXml(props, 'padding', ctx);
    const variant = resolveXml(props, 'variant', ctx);
    const maxWidth = resolveXml(props, 'maxWidth', ctx);
    const elevation = resolveXml(props, 'elevation', ctx);
    const minHeight = resolveXml(props, 'minHeight', ctx);

    if (padding != null && !isXmlEnum(padding, SPACINGS)) {
        throw new Error(`Unsupported Card padding '${String(padding)}'`);
    }

    if (elevation != null && !isXmlEnum(elevation, ELEVATIONS)) {
        throw new Error(`Unsupported Card elevation '${String(elevation)}'`);
    }

    if (variant != null && !isXmlEnum(variant, CARD_VARIANTS)) {
        throw new Error(`Unsupported Card variant '${String(variant)}'`);
    }

    return (
        <AstryxCard
            width={typeof width === 'string' || typeof width === 'number' ? width : undefined}
            height={typeof height === 'string' || typeof height === 'number' ? height : undefined}
            padding={padding}
            variant={variant}
            maxWidth={typeof maxWidth === 'string' || typeof maxWidth === 'number' ? maxWidth : undefined}
            elevation={elevation}
            minHeight={typeof minHeight === 'string' || typeof minHeight === 'number' ? minHeight : undefined}
        >
            {renderNode(nodes, ctx)}
        </AstryxCard>
    );
}
