import cantons from './switzerland.json';
import { geographySchema } from '@/components/longlink/maps/data';

export const switzerland = geographySchema.parse(cantons);
export const switzerlandAttribution = cantons.attribution;
