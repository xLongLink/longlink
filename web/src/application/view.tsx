import { RuntimeApplicationView } from '@/xml/ApplicationView';
import ApplicationNotFound from '@/application/runtime/NotFound';

/** Renders pages registered by the embedded LongLink Application. */
export default function ApplicationView() {
    return <RuntimeApplicationView basePath="/" notFound={ApplicationNotFound} pages="/pages.json" />;
}
