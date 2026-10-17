import { useState } from 'react';
import ViewLayout from './ViewLayout';
import { Button } from '@/components/ui/Button';
import { Step, Stepper } from '@/components/ui/Stepper';

/** Documents Stepper in LongLink Views. */
export default function StepperPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Stepper"
            examples={[
                {
                    title: 'Stepper',
                    preview: <StepperExample />,
                    code: `function Example() {
  return (
    <Stepper activeStep={1}>
      <Step step={0} label="Details" />
      <Step step={1} label="Review" />
      <Step step={2} label="Complete" />
    </Stepper>
  );
}`,
                },
                {
                    title: 'Step actions',
                    preview: <StepActionsExample />,
                    code: `function Example() {
  const [approved, setApproved] = useState(false);

  return (
    <Stepper activeStep={1} orientation="vertical">
      <Step
        step={0}
        label="contract-v1.pdf"
        description="Uploaded by Ana on Oct 2"
        actions={<Button label="Download" size="sm" />}
      />
      <Step
        step={1}
        label="contract-v2.pdf"
        description="Uploaded by Ben on Oct 9"
        actions={
          <>
            <Button label="Download" size="sm" />
            {!approved && <Button label="Approve" variant="primary" size="sm" onClick={() => setApproved(true)} />}
          </>
        }
      />
    </Stepper>
  );
}`,
                },
            ]}
        />
    );
}

/** Demonstrates per-step actions on an upload timeline without leaving the documentation page. */
function StepActionsExample() {
    const [approved, setApproved] = useState(false);

    // Offer downloads for every upload and approval only while the latest upload is pending.
    return (
        <Stepper activeStep={1} orientation="vertical">
            <Step
                step={0}
                label="contract-v1.pdf"
                description="Uploaded by Ana on Oct 2"
                actions={<Button label="Download" size="sm" />}
            />
            <Step
                step={1}
                label="contract-v2.pdf"
                description="Uploaded by Ben on Oct 9"
                actions={
                    <>
                        <Button label="Download" size="sm" />
                        {!approved && (
                            <Button label="Approve" variant="primary" size="sm" onClick={() => setApproved(true)} />
                        )}
                    </>
                }
            />
        </Stepper>
    );
}

/** Renders the page's stepper example for documentation and the catalog. */
export function StepperExample({ orientation = 'horizontal' }: { orientation?: 'horizontal' | 'vertical' }) {
    // Show the review stage in a three-step process.
    return (
        <Stepper activeStep={1} orientation={orientation}>
            <Step step={0} label="Details" />
            <Step step={1} label="Review" />
            <Step step={2} label="Complete" />
        </Stepper>
    );
}
