// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import {
    Stepper,
    StepperContent,
    StepperDescription,
    StepperIndicator,
    StepperItem,
    StepperNav,
    StepperPanel,
    StepperSeparator,
    StepperTitle,
    StepperTrigger
} from '@/components/reui/stepper';

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
