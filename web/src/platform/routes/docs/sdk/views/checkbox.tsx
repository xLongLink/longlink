import FormDocumentation from './form-documentation';
import { Checkbox } from '@/views/adapter/form/checkbox';

/** Shows a checkbox whose visible label activates the control. */
export function CheckboxExample() {
    return (
        <Checkbox
            name="approved"
            label="Approved"
            description="Mark this order as ready for fulfillment."
            defaultChecked
        />
    );
}

/** Documents checked state and native checkbox submission. */
export default function CheckboxPage() {
    return (
        <FormDocumentation
            name="Checkbox"
            preview={<CheckboxExample />}
            code={`function Example() {
  return (
    <Checkbox
      name="approved"
      label="Approved"
      description="Mark this order as ready for fulfillment."
      defaultChecked
    />
  );
}`}
        />
    );
}
