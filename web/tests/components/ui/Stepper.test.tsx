// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, expect, vi } from 'vitest';
import { Button } from '@/components/ui/Button';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../render';
import {
    ProgressStepper,
    Step,
    Stepper,
    StepperContent,
    StepperDescription,
    StepperIndicator,
    StepperItem,
    StepperNav,
    StepperPanel,
    StepperSeparator,
    StepperTitle,
    StepperTrigger,
} from '@/components/ui/Stepper';

it('supports compound controlled navigation and preserves force-mounted drafts and native part props', async () => {
    const submit = vi.fn((event: React.FormEvent) => event.preventDefault());

    function Process() {
        const [value, setValue] = useState(1);

        return (
            <Stepper value={value} onValueChange={setValue}>
                <StepperNav aria-label="Application">
                    <StepperItem step={1}>
                        <StepperTrigger>
                            <StepperIndicator aria-label="First">1</StepperIndicator>
                            <StepperTitle title="Identity">Details</StepperTitle>
                            <StepperDescription id="step-help">Enter your name</StepperDescription>
                        </StepperTrigger>
                        <StepperSeparator aria-hidden="true" />
                    </StepperItem>
                    <StepperItem step={2}>
                        <StepperTrigger>Review</StepperTrigger>
                    </StepperItem>
                    <StepperItem step={3} disabled>
                        <StepperTrigger>Unavailable</StepperTrigger>
                    </StepperItem>
                </StepperNav>
                <StepperPanel aria-label="Panels">
                    <StepperContent value={1} forceMount aria-describedby="step-help">
                        <input name="name" defaultValue="Draft" />
                    </StepperContent>
                    <StepperContent value={2}>Review your application</StepperContent>
                </StepperPanel>
            </Stepper>
        );
    }

    await withMounted(
        <form onSubmit={submit}>
            <Process />
        </form>,
        async (output) => {
            const draft = output.querySelector<HTMLInputElement>('input');
            const buttons = output.querySelectorAll('button');
            const content = output.querySelector('[aria-describedby="step-help"]');

            if (!draft || !content) throw new Error('Expected persistent draft panel');
            draft.value = 'Retained';
            expect(output.querySelector('nav')?.getAttribute('aria-label')).toBe('Application');
            expect(output.querySelector('[data-slot="stepper-indicator"]')?.getAttribute('aria-label')).toBe('First');
            expect(output.querySelector('h3')?.title).toBe('Identity');
            expect(output.querySelector('#step-help')?.textContent).toBe('Enter your name');
            expect(output.querySelector('[data-slot="stepper-separator"]')?.getAttribute('aria-hidden')).toBe('true');
            expect(output.querySelector('[data-slot="stepper-panel"]')?.getAttribute('aria-label')).toBe('Panels');
            expect(buttons[0].type).toBe('button');
            expect(buttons[0].getAttribute('aria-controls')).toBe(content.id);
            expect(content.getAttribute('aria-labelledby')).toBe(buttons[0].id);

            await act(async () => buttons[1].click());
            expect(content.hasAttribute('hidden')).toBe(true);
            expect(output.querySelector('input')).toBe(draft);
            expect(output.textContent).toContain('Review your application');
            await act(async () => buttons[2].click());
            expect(buttons[1].getAttribute('aria-selected')).toBe('true');
            await act(async () => buttons[0].click());
            expect(content.hasAttribute('hidden')).toBe(false);
            expect(draft.value).toBe('Retained');
            expect(output.textContent).not.toContain('Review your application');
            expect(submit).not.toHaveBeenCalled();
        }
    );
});

it('preserves the authored process step labels', () => {
    // Act
    const output = renderStatic(
        <ProgressStepper activeStep={1}>
            <Step step={0} label="Review" />
            <Step step={1} label="Deploy" />
        </ProgressStepper>
    );

    // Assert
    expect(output.textContent).toContain('Review');
    expect(output.textContent).toContain('Deploy');
});

it('renders step actions inside their own step without nesting them in the step button', async () => {
    // Act
    await withMounted(
        <ProgressStepper activeStep={1} orientation="vertical" onStepClick={() => {}}>
            <Step step={0} label="contract-v1.pdf">
                <Button variant="outline">Download</Button>
            </Step>
            <Step step={1} label="contract-v2.pdf">
                <Button variant="outline">Approve</Button>
            </Step>
        </ProgressStepper>,
        async (output) => {
            // Assert
            const steps = output.querySelectorAll('li');
            expect(steps[0].textContent).toContain('Download');
            expect(steps[0].textContent).not.toContain('Approve');
            expect(steps[1].textContent).toContain('Approve');
            expect(output.querySelector('button button')).toBeNull();
        }
    );
});

it('runs a step action without activating its step', async () => {
    // Arrange
    const onStepClick = vi.fn();
    const onApprove = vi.fn();

    // Act
    await withMounted(
        <ProgressStepper activeStep={0} orientation="vertical" onStepClick={onStepClick}>
            <Step step={0} label="contract-v1.pdf" />
            <Step step={1} label="contract-v2.pdf">
                <Button variant="outline" onClick={onApprove}>
                    Approve
                </Button>
            </Step>
        </ProgressStepper>,
        async (output) => {
            const approve = Array.from(output.querySelectorAll('button')).find(
                (button) => button.textContent === 'Approve'
            );

            await act(async () => approve?.click());

            // Assert
            expect(onApprove).toHaveBeenCalledOnce();
            expect(onStepClick).not.toHaveBeenCalled();
        }
    );
});

it('keeps steps inert without onStepClick while their actions remain focusable', async () => {
    // Act
    await withMounted(
        <ProgressStepper activeStep={0} orientation="vertical">
            <Step step={0} label="contract-v1.pdf" description="Uploaded by Ana">
                <Button variant="outline">Download</Button>
            </Step>
        </ProgressStepper>,
        async (output) => {
            const buttons = output.querySelectorAll('button');
            buttons[0]?.focus();

            // Assert
            expect(Array.from(buttons, (button) => button.textContent)).toEqual(['Download']);
            expect(document.activeElement).toBe(buttons[0]);
        }
    );
});

it('activates authored progress indices without submitting the owning form', async () => {
    const onStepClick = vi.fn();
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    await withMounted(
        <form onSubmit={onSubmit}>
            <ProgressStepper activeStep={4} onStepClick={onStepClick}>
                <Step step={3} label="Prepare" />
                <Step step={4} label="Review" />
                <Step label="Finish" />
            </ProgressStepper>
        </form>,
        async (output) => {
            const current = output.querySelector('[aria-current="step"]');

            const prepare = Array.from(output.querySelectorAll('button')).find((button) =>
                button.textContent?.startsWith('Prepare')
            );

            const finish = Array.from(output.querySelectorAll('button')).find((button) =>
                button.textContent?.includes('Finish')
            );

            expect(current?.textContent).toContain('Review');
            await act(async () => prepare?.click());
            await act(async () => finish?.click());
            expect(onStepClick.mock.calls).toEqual([[3], [2]]);

            // Keyboard navigation keeps activation separate from focus and preserves public indices.
            prepare?.focus();
            await act(async () => user.keyboard('{ArrowRight}'));
            expect(document.activeElement?.textContent).toContain('Review');
            expect(onStepClick).toHaveBeenCalledTimes(2);
            await act(async () => user.keyboard('{End}{Enter}'));
            expect(onStepClick.mock.calls.at(-1)).toEqual([2]);
            expect(onSubmit).not.toHaveBeenCalled();
        }
    );
});
