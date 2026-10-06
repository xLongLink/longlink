import type { ReactNode } from 'react';
import { Stepper as AstryxStepper, Step as AstryxStep } from '@astryxdesign/core/Stepper';

/** Displays the current step using standard progress indicators. */
export function Stepper({
    activeStep = 0,
    ...props
}: {
    children?: ReactNode;
    activeStep?: number;
    orientation?: 'horizontal' | 'vertical';
}) {
    // Show horizontal progress unless a vertical flow is requested.
    return (
        <AstryxStepper
            {...props}
            children={props.children}
            activeStep={activeStep}
            orientation={props.orientation ?? 'horizontal'}
        />
    );
}

/** Defines the label and index of a step. */
export function Step(props: {
    /** Zero-based index of this step in the process. */
    step: number;
    /** Visible label identifying the step. */
    label: string;
}) {
    return <AstryxStep {...props} />;
}
