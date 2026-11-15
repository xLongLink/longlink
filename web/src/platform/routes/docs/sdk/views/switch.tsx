import FormDocumentation from './form-documentation';
import { Switch } from '@/views/adapter/form/switch';

/** Shows a labeled boolean preference. */
export function SwitchExample() {
    return <Switch name="notifications" label="Email notifications" defaultChecked />;
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
      checked={checked}
      onCheckedChange={setChecked}
    />
  );
}`}
        />
    );
}
