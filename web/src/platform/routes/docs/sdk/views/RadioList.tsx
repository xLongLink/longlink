import ViewLayout from './ViewLayout';
import FormPreview from './FormPreview';
import { RadioList, RadioListItem } from '@/components/ui/RadioList';

/** Documents RadioList in LongLink Views. */
export default function RadioListPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="RadioList"
            examples={[
                {
                    title: 'Plan form',
                    preview: (
                        <FormPreview>
                            <RadioListExample />
                        </FormPreview>
                    ),
                    code: `/** Submits one plan from a native radio group. */
export default function PlanForm() {
  return (
    <Form action="/api/example" method="post">
      <Stack gap={3}>
        <RadioList name="plan" label="Plan" defaultValue="team" orientation="horizontal" required>
          <RadioListItem label="Solo" value="solo" />
          <RadioListItem label="Team" value="team" />
        </RadioList>
        <Stack direction="horizontal" gap={2}>
          <Button type="submit" label="Submit" variant="primary" />
          <Button type="reset" label="Reset" />
        </Stack>
      </Stack>
    </Form>
  );
}`,
                },
            ]}
        />
    );
}

/** Shows a named radio group with one initial selection. */
export function RadioListExample() {
    // Let the group manage selection while the form collects only the checked value.
    return (
        <RadioList name="plan" label="Plan" defaultValue="team" orientation="horizontal" required>
            <RadioListItem label="Solo" value="solo" />
            <RadioListItem label="Team" value="team" />
        </RadioList>
    );
}
