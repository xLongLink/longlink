import { XmlApplication } from '@/xml/runtime/Application';

/** Renders an SDK application from its local page manifest. */
export default function Application() {
    return <XmlApplication navigationBaseUrl="/" pagesUrl="/pages.json" requestBaseUrl="/" />;
}
