import FormDocumentation from './form-documentation';
import { Combobox } from '@/views/adapter/form/combobox';

/** Shows searchable labels with stable submitted values. */
export function ComboboxExample() {
    return (
        <Combobox
            name="status"
            label="Status"
            description="Search for an order status."
            placeholder="Search statuses"
            options={[
                { value: 'open', label: 'Open' },
                { value: 'closed', label: 'Closed' }
            ]}
        />
    );
}

/** Documents search and multiple selection without exposing chips or popup internals. */
export default function ComboboxPage() {
    return (
        <FormDocumentation
            name="Combobox"
            preview={<ComboboxExample />}
            code={`function Example() {
  return (
    <Combobox
      name="status"
      label="Status"
      description="Search for an order status."
      placeholder="Search statuses"
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
