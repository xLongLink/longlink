// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import { Button } from '@/components/ui/Button';
import { Stepper, Step } from '@/components/ui/Stepper';
import { renderStatic, withMounted } from '../../render';

it('preserves the authored process step labels', () => {
    // Act
    const output = renderStatic(
        <Stepper activeStep={1}>
            <Step step={0} label="Review" />
            <Step step={1} label="Deploy" />
        </Stepper>
    );

    // Assert
    expect(output.textContent).toContain('Review');
    expect(output.textContent).toContain('Deploy');
});

it('renders step actions inside their own step without nesting them in the step button', async () => {
    // Act
    await withMounted(
        <Stepper activeStep={1} orientation="vertical" onStepClick={() => {}}>
            <Step step={0} label="contract-v1.pdf" actions={<Button label="Download" />} />
            <Step step={1} label="contract-v2.pdf" actions={<Button label="Approve" />} />
        </Stepper>,
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
        <Stepper activeStep={0} orientation="vertical" onStepClick={onStepClick}>
            <Step step={0} label="contract-v1.pdf" />
            <Step step={1} label="contract-v2.pdf" actions={<Button label="Approve" onClick={onApprove} />} />
        </Stepper>,
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
        <Stepper activeStep={0} orientation="vertical">
            <Step
                step={0}
                label="contract-v1.pdf"
                description="Uploaded by Ana"
                actions={<Button label="Download" />}
            />
        </Stepper>,
        async (output) => {
            const buttons = output.querySelectorAll('button');
            buttons[0]?.focus();

            // Assert
            expect(Array.from(buttons, (button) => button.textContent)).toEqual(['Download']);
            expect(document.activeElement).toBe(buttons[0]);
        }
    );
});
