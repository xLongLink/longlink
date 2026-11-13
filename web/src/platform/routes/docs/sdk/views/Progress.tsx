import ViewLayout from './ViewLayout';
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/Progress';

/** Documents the native shadcn Progress composition. */
export default function ProgressPage() {
    return (
        <ViewLayout
            name="Progress"
            properties={[
                { name: 'value', type: 'number | null', description: 'Current value; null means indeterminate.' },
                { name: 'max', type: 'number', description: 'Maximum value; defaults to 100.' },
                { name: 'children', type: 'ReactNode', description: 'Compose ProgressLabel and ProgressValue.' },
                { name: 'format', type: 'Intl.NumberFormatOptions', description: 'Value formatting options.' }
            ]}
            example={{
                title: 'Progress',
                preview: <ProgressExample />,
                code: `function Example() {
  return (
    <Progress value={60}>
      <ProgressLabel>Progress</ProgressLabel>
      <ProgressValue />
    </Progress>
  );
}`
            }}
        />
    );
}

/** Renders labeled progress for the documentation catalog. */
export function ProgressExample() {
    return (
        <Progress value={60}>
            <ProgressLabel>Progress</ProgressLabel>
            <ProgressValue />
        </Progress>
    );
}
