import type { Props } from '../types';
/** Renders a spacer block for visual separation. */
export function Br({ props, nodes }: Props) {
    void props;
    void nodes;

    return <div aria-hidden="true" className="block h-4" />;
}
