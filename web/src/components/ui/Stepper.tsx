import { Icon } from './Icon';
import { Button } from './Button';
import { ReportedError } from '@/lib/reported';
import { Stack } from '@astryxdesign/core/Stack';
import { Banner } from '@astryxdesign/core/Banner';
import { FormValidationContext } from './FormField';
import { useAnnounce } from '@astryxdesign/core/hooks';
import { Layout, LayoutHeader, LayoutContent } from '@astryxdesign/core/Layout';
import { Stepper as AstryxStepper, Step as AstryxStep } from '@astryxdesign/core/Stepper';
import {
    Children,
    cloneElement,
    isValidElement,
    useContext,
    useEffect,
    useEffectEvent,
    useRef,
    useState,
    type ReactElement,
    type ReactNode,
} from 'react';

type StepProps = {
    /** Zero-based progress index; defaults to child order inside Stepper. */
    step?: number;
    label: string;
    description?: string;
    /** Persistent panel content in wizard mode; inline content in progress mode. */
    children?: ReactNode;
};

type StepperProps = {
    children?: ReactNode;
    activeStep?: number;
    orientation?: 'horizontal' | 'vertical';
    /** Enables step activation in progress mode; receives selection changes in wizard mode. */
    onStepClick?: (index: number) => void;
    /** Wizard mode adds persistent panels and Next/Back controls without submitting data. */
    variant?: 'progress' | 'wizard';
    /** Bounds a wizard, keeping progress above its independently scrollable panels. */
    height?: number | string;
    /** Runs a step-specific action after validation; false prevents advancement. */
    next?: (step: number) => { label: string; action: () => void | boolean | Promise<void | boolean> } | undefined;
    onCancel?: () => void;
    backVariant?: 'secondary' | 'ghost';
};

/** Displays progress or owns a wizard's panels and navigation independently of Form. */
export function Stepper({ variant = 'progress', ...props }: StepperProps) {
    // Opt into wizard behavior without changing existing progress and timeline usage.
    if (variant === 'wizard') return <Wizard {...props} />;

    return (
        <AstryxStepper
            activeStep={props.activeStep ?? 0}
            orientation={props.orientation ?? 'horizontal'}
            onStepClick={props.onStepClick}
        >
            {Children.map(props.children, (child, index) =>
                isValidElement<StepProps>(child) && child.type === Step
                    ? cloneElement(child, { step: child.props.step ?? index })
                    : child
            )}
        </AstryxStepper>
    );
}

/** Keeps wizard drafts mounted and delegates field validation to an enclosing Form. */
function Wizard(props: StepperProps) {
    const rootRef = useRef<HTMLElement>(null);
    const pending = useRef(false);
    const validate = useContext(FormValidationContext);
    const announce = useAnnounce();
    const [selection, setSelection] = useState(0);
    const [advancing, setAdvancing] = useState(false);
    const [error, setError] = useState<string>();

    // Derive panel order from direct Step children, not author-supplied progress indices.
    const steps = Children.toArray(props.children).filter(
        (child): child is ReactElement<StepProps> => isValidElement<StepProps>(child) && child.type === Step
    );

    const activeStep = Math.max(0, Math.min(props.activeStep ?? selection, Math.max(steps.length - 1, 0)));
    const next = activeStep < steps.length - 1 ? props.next?.(activeStep) : undefined;
    const previousStep = useRef(activeStep);

    // Move keyboard focus with navigation without stealing it when a wizard first mounts.
    useEffect(() => {
        if (previousStep.current !== activeStep) {
            rootRef.current?.querySelector<HTMLElement>(`[data-step-panel="${activeStep}"]`)?.focus();
            previousStep.current = activeStep;
        }
    }, [activeStep]);

    /** Updates local navigation and notifies a controlled caller. */
    function select(index: number) {
        setSelection(index);
        props.onStepClick?.(index);
    }

    /** Validates before running intermediate work, retaining drafts on failure. */
    async function advance() {
        if (pending.current || activeStep >= steps.length - 1) return;
        const panel = rootRef.current?.querySelector<HTMLElement>(`[data-step-panel="${activeStep}"]`);

        if (!panel || (validate && !validate(panel))) return;
        pending.current = true;
        setAdvancing(true);
        setError(undefined);

        // Keep asynchronous domain checks separate from final Form submission.
        try {
            const result = await next?.action();

            if (result !== false) select(activeStep + 1);
        } catch (failure) {
            if (failure instanceof ReportedError) return;
            const message = failure instanceof Error ? failure.message : 'Could not continue';

            setError(message);
            announce(message, 'assertive');
        } finally {
            pending.current = false;
            setAdvancing(false);
        }
    }

    // Enter advances intermediate panels, while the last panel's explicit submit button belongs to Form.
    const interceptSubmit = useEffectEvent((event: SubmitEvent) => {
        if (event.defaultPrevented) return;

        if (pending.current || activeStep < steps.length - 1) {
            event.preventDefault();
            void advance();
        }
    });

    const reveal = useEffectEvent((event: Event) => {
        const panel = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-step-panel]') : null;

        if (panel && panel.closest('[data-stepper-wizard]') === rootRef.current) {
            select(Number(panel.dataset.stepPanel));
        }
    });

    const reset = useEffectEvent((event: Event) => {
        queueMicrotask(() => {
            if (!event.defaultPrevented) {
                select(0);
                setError(undefined);
            }
        });
    });

    // Bind only to the owning form and panel tree, and remove every listener on unmount.
    useEffect(() => {
        const root = rootRef.current;
        const form = root?.closest('form');

        root?.addEventListener('longlink:reveal', reveal);
        form?.addEventListener('submit', interceptSubmit, true);
        form?.addEventListener('reset', reset);

        return () => {
            root?.removeEventListener('longlink:reveal', reveal);
            form?.removeEventListener('submit', interceptSubmit, true);
            form?.removeEventListener('reset', reset);
        };
    }, []);

    // Progress never renders panel children a second time.
    const progress = (
        <AstryxStepper
            activeStep={activeStep}
            orientation={props.orientation ?? 'horizontal'}
            horizontalOptions={{ minimumStepWidth: 112, collapsedVariant: 'withLabel' }}
        >
            {steps.map((child, index) => (
                <AstryxStep
                    key={child.key}
                    step={index}
                    label={child.props.label}
                    description={child.props.description}
                />
            ))}
        </AstryxStepper>
    );

    const content = (
        <Stack gap={4}>
            {steps.map((child, index) => (
                <fieldset
                    key={child.key}
                    data-step-panel={index}
                    hidden={index !== activeStep}
                    disabled={advancing}
                    className="m-0 min-w-0 border-0 p-0"
                    aria-label={child.props.label}
                    tabIndex={-1}
                >
                    <Stack gap={3}>{child.props.children}</Stack>
                </fieldset>
            ))}
            <Stack direction="horizontal" justify="between" align="center" gap={2}>
                <Stack direction="horizontal" gap={2}>
                    {props.onCancel && (
                        <Button label="Cancel" variant="ghost" disabled={advancing} onClick={props.onCancel} />
                    )}
                    {(!props.onCancel || activeStep > 0) && (
                        <Button
                            label="Back"
                            variant={props.backVariant ?? 'secondary'}
                            disabled={advancing || activeStep === 0}
                            onClick={() => select(activeStep - 1)}
                        />
                    )}
                </Stack>
                {activeStep < steps.length - 1 && (
                    <Button label={next?.label ?? 'Next'} variant="primary" onClick={advance} disabled={advancing} />
                )}
            </Stack>
            {error && <Banner status="error" title={error} icon={<Icon icon="error" size="md" />} />}
        </Stack>
    );

    // Reuse the same persistent panels in inline and bounded wizard frames.
    return (
        <Stack ref={rootRef} height={props.height} gap={0} data-stepper-wizard="">
            {props.height === undefined ? (
                <Stack gap={4}>
                    {progress}
                    {content}
                </Stack>
            ) : (
                <Layout
                    padding={0}
                    header={
                        <LayoutHeader hasDivider={false}>
                            <Stack paddingInline={8} paddingBlock={4}>
                                {progress}
                            </Stack>
                        </LayoutHeader>
                    }
                    content={
                        <LayoutContent padding={8}>
                            <Stack minHeight="100%" justify="center" width="100%" maxWidth={640} className="mx-auto">
                                {content}
                            </Stack>
                        </LayoutContent>
                    }
                />
            )}
        </Stack>
    );
}

/** Defines progress metadata and, in wizard mode, one persistent content panel. */
export function Step(props: StepProps) {
    return <AstryxStep {...props} step={props.step ?? 0} />;
}
