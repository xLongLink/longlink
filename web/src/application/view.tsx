import View from '@/pages/View';

/** Renders pages registered by the embedded LongLink Application. */
export default function ApplicationView() {
    return <View pages="/pages.json" />;
}
