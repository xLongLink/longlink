import type { MetaFunction } from 'react-router';
import Home from '@/platform/Home';
import { publicSeoMeta } from '@/lib/seo';
import { homePage } from '@/platform/public';

export const meta: MetaFunction = () => publicSeoMeta(homePage);

export default Home;
