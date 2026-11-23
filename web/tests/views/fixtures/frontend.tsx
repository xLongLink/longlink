/* oxlint-disable react/jsx-no-undef, typescript/triple-slash-reference -- Views consume the SDK's ambient globals. */
/// <reference path="../../../../sdk/longlink/.static/jsx/frontend.d.ts" />

const values = new globalThis.Map<string, number>([['value', 1]]);
const image: HTMLImageElement = new globalThis.Image(12, 24);
const text: globalThis.Text = new globalThis.Text('native');
const schema = z.object({ name: z.string(), count: z.number().int().nonnegative() });
const parsed: z.infer<typeof schema> = schema.parse({ name: 'Order', count: 1 });
const count: number = parsed.count;
// @ts-expect-error Parsed fields retain their schema types.
const invalidCount: string = parsed.count;
const valid = (
    <>
        <Text tone="muted">
            {values.get('value')}
            {text.data}
        </Text>
        <Image src="/api/photo" alt="Photo" ratio={2} />
        <Map center={[0, 20]} zoom={2} />
        <FileViewer src="/api/file" title="File" />
        <Timestamp value="2026-01-01" />
    </>
);

// @ts-expect-error Accessible image descriptions are required.
const missingAlt = <Image src="/api/photo" />;
// @ts-expect-error View styling is prop driven.
const imageStyle = <Image src="/api/photo" alt="" className="hidden" />;
// @ts-expect-error Alternate network sources are not supported.
const imageSource = <Image src="/api/photo" alt="" srcSet="/elsewhere" />;
// @ts-expect-error Map centers must be coordinates.
const mapCenter = <Map center="wrong" />;
// @ts-expect-error Map zoom must be numeric.
const mapZoom = <Map zoom="wrong" />;
// @ts-expect-error Text sizes must use the supported scale.
const textSize = <Text size="wrong" />;
// @ts-expect-error FileViewer requires an accessible title.
const fileTitle = <FileViewer src="/api/file" />;
// @ts-expect-error Timestamps cannot render arbitrary objects.
const timestampValue = <Timestamp value={{ invalid: true }} />;

void [
    image,
    count,
    invalidCount,
    valid,
    missingAlt,
    imageStyle,
    imageSource,
    mapCenter,
    mapZoom,
    textSize,
    fileTitle,
    timestampValue
];
