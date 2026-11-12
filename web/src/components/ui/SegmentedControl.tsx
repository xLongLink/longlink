import { SegmentedControl as AstryxSegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';

/** Selects a chart or display mode with native radio semantics and keyboard navigation. */
export function SegmentedControl(props: {
    label: string;
    value: string;
    options: readonly { value: string; label: string }[];
    onChange: (value: string) => void;
}) {
    // Keep the compact selector separate from page-navigation tabs and their panels.
    return (
        <AstryxSegmentedControl
            label={props.label}
            value={props.value}
            onChange={props.onChange}
            size="sm"
            className="rounded-full! [&_.astryx-segmented-control-item]:rounded-full!"
        >
            {props.options.map((option) => (
                <SegmentedControlItem key={option.value} value={option.value} label={option.label} />
            ))}
        </AstryxSegmentedControl>
    );
}
