import { viewComponent } from '../props';
import * as card from '@/components/shadcn/card';
import * as interactive from '@/components/custom/interactive-card';

export const Card = viewComponent(card.Card);

export const CardHeader = viewComponent(card.CardHeader);

export const CardTitle = viewComponent(card.CardTitle);

export const CardDescription = viewComponent(card.CardDescription);

export const CardAction = viewComponent(card.CardAction);

export const CardContent = viewComponent(card.CardContent);

export const CardFooter = viewComponent(card.CardFooter);

export const InteractiveCard = viewComponent(interactive.InteractiveCard);
