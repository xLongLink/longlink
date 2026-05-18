/** Props accepted by the XML br bridge component. */
export interface BrProps {
    className?: string;
}

/** Renders a spacer block for visual separation. */
export function Br({ className: _className }: BrProps) {
    return <div aria-hidden="true" />;
}
