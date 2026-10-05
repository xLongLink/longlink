import ViewLayout from './ViewLayout';

/** Documents IconButton in LongLink Views. */
export default function IconButtonPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="IconButton"
            examples={[
                {
                    title: 'IconButton',
                    code: `function Example() {
  return (
    <IconButton
      label="Refresh"
      icon={<Icon icon="refresh" size="sm" />}
      onClick={async () => {
        await request('/api/refresh', { method: 'POST' });
      }}
    />
  );
}`,
                },
            ]}
        />
    );
}
