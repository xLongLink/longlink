import { Separator } from '@ui/separator';
import type { Props } from '@xml';

/** Props accepted by the XML Divider component. */
export interface DividerProps extends Props {}

/** Renders a simple horizontal divider. */
export function Divider({ props, nodes }: DividerProps) {
    void props;
    void nodes;

    return <Separator />;
}
