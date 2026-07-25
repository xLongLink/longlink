import type { MetaFunction } from 'react-router';
import Pricing from '@/pages/Pricing';
import { pricingSeoPage, publicSeoMeta } from '@/lib/seo';

export const meta: MetaFunction = () => publicSeoMeta(pricingSeoPage);

export default Pricing;
