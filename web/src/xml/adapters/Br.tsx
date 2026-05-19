import type { Props } from '@xml';
/** Props accepted by the XML Br component. */
export interface BrProps extends Props {}
/** Renders a spacer block for visual separation. */
export function Br({ props, nodes }: BrProps) {
    void props;
    void nodes;

    return <div aria-hidden="true" className="block h-4" />;
}
