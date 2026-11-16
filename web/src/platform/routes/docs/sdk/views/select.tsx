import FormDocumentation from './form-documentation';
import { Select } from '@/views/adapter/form/select';

/** Shows labeled options rather than public popup composition. */
export function SelectExample() {
    return (
        <Select
            name="status"
            label="Status"
            description="Choose the current order status."
            defaultValue="open"
            options={[
                { value: 'open', label: 'Open' },
                { value: 'closed', label: 'Closed' }
            ]}
        />
    );
}

/** Documents options-based selection with native form values. */
export default function SelectPage() {
    return (
        <FormDocumentation
            name="Select"
            preview={<SelectExample />}
            code={`function Example() {
  return (
    <Select
      name="status"
      label="Status"
      description="Choose the current order status."
      defaultValue="open"
      options={[
        { value: "open", label: "Open" },
        { value: "closed", label: "Closed" },
      ]}
    />
  );
}`}
        />
    );
}
