/** Shows locations, routes, clusters, and connections together on one map. */
export default function MapsShowcase() {
    /** @type {MapMarker[]} */
    const locations = [
        { id: 'zurich', coordinates: [8.5417, 47.3769], label: 'Zurich', description: 'Main office' },
        { id: 'bern', coordinates: [7.4474, 46.948], label: 'Bern', description: 'Regional office' },
        { id: 'lucerne', coordinates: [8.3093, 47.0502], label: 'Lucerne', description: 'Service center' },
        { id: 'geneva', coordinates: [6.1432, 46.2044], label: 'Geneva', description: 'Western office' },
        { id: 'basel', coordinates: [7.5886, 47.5596], label: 'Basel', description: 'Northern office' }
    ];
    /** @type {MapRoute[]} */
    const routes = [
        {
            id: 'delivery',
            coordinates: [
                [8.5417, 47.3769],
                [8.3093, 47.0502],
                [7.4474, 46.948]
            ]
        }
    ];
    /** @type {MapArc[]} */
    const connections = [
        { id: 'geneva', from: [8.5417, 47.3769], to: [6.1432, 46.2044] },
        { id: 'basel', from: [8.5417, 47.3769], to: [7.5886, 47.5596] }
    ];
    /** @type {MapMarker[]} */
    const serviceAreas = [
        { id: 'lausanne', coordinates: [6.6323, 46.5197], label: 'Lausanne' },
        { id: 'st-gallen', coordinates: [9.3767, 47.4245], label: 'St. Gallen' }
    ];
    /** @type {MapMarker[]} */
    const clustered = serviceAreas.flatMap((location) =>
        Array.from({ length: 12 }, (_, index) => ({
            id: `${location.id}-${index}`,
            label: `${location.label} ${index + 1}`,
            coordinates: [
                location.coordinates[0] + (index % 4) * 0.025,
                location.coordinates[1] + Math.floor(index / 4) * 0.02
            ]
        }))
    );
    const [selected, setSelected] = useState('');

    return (
        <Stack padding={4}>
            <Card padding="none" footer={selected || undefined}>
                <Box height={560}>
                    <StreetMap
                        locations={locations}
                        routes={routes}
                        clusters={clustered}
                        connections={connections}
                        center={[7.8, 46.9]}
                        zoom={6}
                        controls={{
                            position: 'top-right',
                            showZoom: true,
                            showCompass: true,
                            showLocate: true,
                            showFullscreen: true
                        }}
                        onSelectLocation={(location) => setSelected(location.label)}
                        aria-label="Offices, delivery routes, service clusters, and connections"
                    />
                </Box>
            </Card>
        </Stack>
    );
}
