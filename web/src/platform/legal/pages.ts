import Terms, { metadata as termsMetadata } from '@/platform/legal/terms';
import Privacy, { metadata as privacyMetadata } from '@/platform/legal/privacy';
import Impressum, { metadata as impressumMetadata } from '@/platform/legal/impressum';

export const legalPages = [
    { Component: Terms, metadata: termsMetadata },
    { Component: Impressum, metadata: impressumMetadata },
    { Component: Privacy, metadata: privacyMetadata },
];
