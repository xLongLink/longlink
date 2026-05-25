import MarkdownDoc from './MarkdownDoc';
import markdown from '../../docs/index.md?raw';

/** Renders the LongLink docs overview page. */
export default function DocsOverviewPage() {
    return <MarkdownDoc content={markdown} />;
}
