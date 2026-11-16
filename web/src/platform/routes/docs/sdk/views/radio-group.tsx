import { RadioGroup } from '@/components/longlink';
import FormDocumentation from './form-documentation';

/** Shows independently labeled radio options inside a named group. */
export function RadioGroupExample() {
    return (
        <RadioGroup
            name="plan"
            label="Plan"
            description="Choose a plan for this workspace."
            defaultValue="team"
            options={[
                { value: 'solo', label: 'Solo' },
                { value: 'team', label: 'Team' }
            ]}
        />
    );
}

/** Documents single-choice groups with caller-owned state. */
export default function RadioGroupPage() {
    return (
        <FormDocumentation
            name="RadioGroup"
            preview={<RadioGroupExample />}
            code={`function Example() {
  return (
    <RadioGroup
      name="plan"
      label="Plan"
      description="Choose a plan for this workspace."
      defaultValue="team"
      options={[
        { value: "solo", label: "Solo" },
        { value: "team", label: "Team" },
      ]}
    />
  );
}`}
        />
    );
}
