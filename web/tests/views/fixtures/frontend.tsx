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
        <Logo src={null} alt="Supplier" />
        <Logo src="/api/logo" alt="Supplier" variant="detail" />
        <Map
            center={[0, 20]}
            zoom={2}
            ref={(map) => {
                map?.getZoom();
            }}
        />
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
// @ts-expect-error Logo dimensions are fixed.
const logoWidth = <Logo src="/api/logo" alt="Supplier" width={64} />;
// @ts-expect-error Logo dimensions are fixed.
const logoHeight = <Logo alt="Supplier" height={64} />;
// @ts-expect-error Accessible logo descriptions are required.
const logoAlt = <Logo />;
// @ts-expect-error Logo styling is fixed.
const logoStyle = <Logo alt="Supplier" style={{ width: 64 }} />;
// @ts-expect-error Logo variants use fixed supported sizes.
const logoVariant = <Logo alt="Supplier" variant="large" />;
// @ts-expect-error Map centers must be coordinates.
const mapCenter = <Map center="wrong" />;
// @ts-expect-error Map zoom must be numeric.
const mapZoom = <Map zoom="wrong" />;
// @ts-expect-error View styling is prop driven.
const mapClass = <Map className="hidden" />;
// @ts-expect-error View styling is prop driven.
const mapStyle = <Map style={{ display: 'none' }} />;
// @ts-expect-error Map appearance belongs to the View runtime.
const mapTheme = <Map theme="dark" />;
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
    logoWidth,
    logoHeight,
    logoAlt,
    logoStyle,
    logoVariant,
    mapCenter,
    mapZoom,
    mapClass,
    mapStyle,
    mapTheme,
    textSize,
    fileTitle,
    timestampValue
];
