import { z } from 'zod';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { resolveXmlProps, xmlNonblankStringSchema } from '../core/props';
import { Step as AstryxStep, Stepper as AstryxStepper } from '@astryxdesign/core/Stepper';

const stepperPropsSchema = z.object({
    activeStep: z.number().int().nonnegative(),
    density: z.enum(['compact', 'balanced', 'spacious']).optional(),
    indicatorPosition: z.enum(['separated', 'on-track']).optional(),
    label: xmlNonblankStringSchema.optional(),
    orientation: z.enum(['horizontal', 'vertical']).optional(),
});

const stepPropsSchema = z.object({
    description: z.string().optional(),
    indicator: z.enum(['auto', 'number', 'none']).optional(),
    isDisabled: z.boolean().default(false),
    isOptional: z.boolean().default(false),
    label: xmlNonblankStringSchema,
    status: z.enum(['accent', 'success', 'warning', 'error']).optional(),
    step: z.number().int().nonnegative(),
});

/** Renders an Astryx progress stepper from XML children. */
export function Stepper({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const { activeStep, density, indicatorPosition, label, orientation } = resolveXmlProps(
        props,
        ctx,
        stepperPropsSchema
    );

    return (
        <AstryxStepper
            activeStep={activeStep}
            density={density}
            indicatorPosition={indicatorPosition}
            label={label}
            orientation={orientation}
        >
            {renderNode(nodes, ctx)}
        </AstryxStepper>
    );
}

/** Renders one named step with optional XML content. */
export function Step({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const { description, indicator, isDisabled, isOptional, label, status, step } = resolveXmlProps(
        props,
        ctx,
        stepPropsSchema
    );

    return (
        <AstryxStep
            description={description}
            indicator={indicator}
            isDisabled={isDisabled}
            isOptional={isOptional}
            label={label}
            status={status}
            step={step}
        >
            {renderNode(nodes, ctx)}
        </AstryxStep>
    );
}
