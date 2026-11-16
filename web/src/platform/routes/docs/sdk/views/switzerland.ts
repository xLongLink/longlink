import cantons from './switzerland.json';
import { geographySchema } from '@/components/longlink/maps/data';

export const switzerland = geographySchema.parse(cantons);
export const switzerlandSource = cantons.source;
export const switzerlandAttribution = cantons.attribution;
