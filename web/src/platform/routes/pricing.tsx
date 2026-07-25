import type { MetaFunction } from 'react-router';
import Pricing from '@/platform/Pricing';
import { publicSeoMeta } from '@/lib/seo';
import { pricingPage } from '@/platform/public';

export const meta: MetaFunction = () => publicSeoMeta(pricingPage);

export default Pricing;
