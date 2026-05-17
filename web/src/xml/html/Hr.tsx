/** Props accepted by the XML hr bridge component. */
export interface HrProps {
    className?: string;
}

/** Renders a horizontal rule. */
export function Hr({ className }: HrProps) {
    return <hr className={className} />;
}
