export { Root as default } from '@/components/Root';

export { Document as Layout } from '@/components/layouts/Document';

/** Declares metadata for the SDK's static SPA fallback document. */
export const meta = () => [{ title: 'LongLink' }, { name: 'robots', content: 'noindex, nofollow' }];
