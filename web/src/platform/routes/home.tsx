import type { MetaFunction } from 'react-router';
import Home from '@/platform/Home';
import { homeSeoPage, publicSeoMeta } from '@/lib/seo';

export const meta: MetaFunction = () => publicSeoMeta(homeSeoPage);

export default Home;
