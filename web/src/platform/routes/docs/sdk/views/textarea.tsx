import { Textarea } from '@/components/longlink';
import FormDocumentation from './form-documentation';

/** Shows an uncontrolled textarea with an associated label. */
export function TextareaExample() {
    return (
        <Textarea
            name="notes"
            label="Notes"
            description="Instructions for fulfilling this order."
            rows={4}
            placeholder="Add order notes"
        />
    );
}

/** Documents the owned textarea without changing native DOM events. */
export default function TextareaPage() {
    return (
        <FormDocumentation
            name="Textarea"
            preview={<TextareaExample />}
            code={`function Example() {
  return (
    <Textarea
      name="notes"
      label="Notes"
      description="Instructions for fulfilling this order."
      rows={4}
      placeholder="Add order notes"
    />
  );
}`}
        />
    );
}
