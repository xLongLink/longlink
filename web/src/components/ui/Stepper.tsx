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
export function Step(props: { step: number; label: string }) {
    return <AstryxStep {...props} />;
}
