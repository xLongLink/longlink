import RuntimeApplicationView from '@/application/runtime/View';

/** Renders pages registered by the embedded LongLink Application. */
export default function ApplicationView() {
    return <RuntimeApplicationView basePath="/" pages="/pages.json" />;
}
