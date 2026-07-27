import type { MetaFunction } from 'react-router';
import { publicSeoMeta } from '@/lib/seo';
import Pricing from '@/platform/Pricing';
import { pricingPage } from '@/platform/public';

export const meta: MetaFunction = () => publicSeoMeta(pricingPage);

export default Pricing;
