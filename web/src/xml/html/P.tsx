import type { XMLComponent } from '@xml';
import { renderNode, useContext } from '@xml';

/** Props accepted by the XML paragraph bridge component. */
export interface PProps {
    children?: unknown;
}

/** Renders a paragraph with standard styling. */
export const P: XMLComponent<PProps> = ({ children }) => {
    const { ctx } = useContext();

    return <p className="leading-7 [&:not(:first-child)]:mt-6">{renderNode(children, ctx)}</p>;
};
