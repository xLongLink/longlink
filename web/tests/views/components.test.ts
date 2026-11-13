import { it, expect } from 'vitest';
import * as card from '@/components/shadcn/card';
import * as components from '@/views/components';
import { InteractiveCard } from '@/components/ui/Card';

it('exposes native card composition separately from LongLink surface interactions', () => {
    expect(components.Card).toBe(card.Card);
    expect(components.CardHeader).toBe(card.CardHeader);
    expect(components.CardTitle).toBe(card.CardTitle);
    expect(components.CardDescription).toBe(card.CardDescription);
    expect(components.CardAction).toBe(card.CardAction);
    expect(components.CardContent).toBe(card.CardContent);
    expect(components.CardFooter).toBe(card.CardFooter);
    expect(components.InteractiveCard).toBe(InteractiveCard);
    expect(components.Card).not.toBe(components.InteractiveCard);
});

it('exposes the authored View API without privileged host providers', () => {
    // Assert
    expect(components).toHaveProperty('Form');
    expect(components).toHaveProperty('Stack');
    expect(Object.hasOwn(components, 'Root')).toBe(false);
    expect(Object.hasOwn(components, 'FileRequestContext')).toBe(false);
    expect(Object.hasOwn(components, 'FormRequestContext')).toBe(false);
});
