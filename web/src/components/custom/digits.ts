/** Folds Unicode decimal digit blocks and removes the invisible marks emitted by RTL formatting. */
export function normalizeDigits(text: string) {
    let normalized = '';

    for (const character of text.normalize('NFKC').replace(/[\u200B-\u200F\u061C\u2066-\u2069\uFEFF]/g, '')) {
        if (!/\p{Nd}/u.test(character)) {
            normalized += character;

            continue;
        }

        const point = character.codePointAt(0);

        if (point === undefined) return null;
        let digit = 0;

        while (digit < 10 && /\p{Nd}/u.test(String.fromCodePoint(point - digit - 1))) digit++;

        if (digit === 10) return null;
        normalized += String(digit);
    }

    return normalized.trim();
}
