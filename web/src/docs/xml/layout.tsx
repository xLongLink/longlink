import MarkdownDoc from '../MarkdownDoc';
import markdown from '../../../docs/xml/layout.md?raw';

/** Renders the XML layout page. */
export default function XmlLayoutPage() {
    return <MarkdownDoc content={markdown} />;
}
