import ViewLayout from './ViewLayout';

/** Documents Avatar in LongLink Views. */
export default function AvatarPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Avatar"
            examples={[
                {
                    title: 'Avatar',
                    code: `function Example() {
  return <Avatar name="Ada Lovelace" />;
}`,
                },
            ]}
        />
    );
}
