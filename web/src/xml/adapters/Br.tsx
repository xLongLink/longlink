import type { Props } from '@xml/types';
/** Renders a spacer block for visual separation. */
export function Br({ props, nodes }: Props) {
    return <div aria-hidden="true" className="block h-4" />;
}
