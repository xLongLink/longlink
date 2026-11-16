import { Switch } from '@/components/longlink';
import FormDocumentation from './form-documentation';

/** Shows a labeled boolean preference. */
export function SwitchExample() {
    return (
        <Switch
            name="notifications"
            label="Email notifications"
            description="Receive an email when an order changes."
            defaultChecked
        />
    );
}

/** Documents controlled and uncontrolled boolean preferences. */
export default function SwitchPage() {
    return (
        <FormDocumentation
            name="Switch"
            preview={<SwitchExample />}
            code={`function Example() {
  const [checked, setChecked] = useState(true);

  return (
    <Switch
      name="notifications"
      label="Email notifications"
      description="Receive an email when an order changes."
      checked={checked}
      onCheckedChange={setChecked}
    />
  );
}`}
        />
    );
}
