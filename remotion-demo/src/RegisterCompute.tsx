import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

const steps = [
    { frame: 0, x: 360, y: 300 },
    { frame: 45, x: 1080, y: 165 },
    { frame: 75, x: 1080, y: 165 },
    { frame: 130, x: 850, y: 545 },
    { frame: 165, x: 850, y: 545 },
    { frame: 230, x: 850, y: 545 },
    { frame: 270, x: 850, y: 545 },
    { frame: 359, x: 1000, y: 580 },
];

/** Animates a fictional registration flow; this is not a recording of the Platform. */
export function RegisterCompute() {
    const frame = useCurrentFrame();
    const screen = frame < 75 ? 'list' : frame < 165 ? 'metadata' : frame < 270 ? 'kubeconfig' : 'complete';
    const x = interpolate(
        frame,
        steps.map((step) => step.frame),
        steps.map((step) => step.x),
        { extrapolateRight: 'clamp' }
    );
    const y = interpolate(
        frame,
        steps.map((step) => step.frame),
        steps.map((step) => step.y),
        { extrapolateRight: 'clamp' }
    );
    const click = [70, 160, 265].find((time) => frame >= time && frame < time + 15);
    const pulse = click === undefined ? 0 : (frame - click) / 15;
    const caption =
        screen === 'list'
            ? '1. Open Compute and select Register Compute'
            : screen === 'metadata'
              ? '2. Enter a name and your HTTPS endpoints'
              : screen === 'kubeconfig'
                ? '3. Provide the cluster kubeconfig and select Register'
                : '4. Your compute appears in the list';

    return (
        <AbsoluteFill style={{ background: '#f4f3ef', color: '#25251f', fontFamily: 'Arial, sans-serif', padding: 50 }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22 }}>
                <strong>LongLink · Connect compute</strong>
                <small>Illustrative prototype — not a live Platform recording</small>
            </header>
            <main
                style={{
                    marginTop: 40,
                    background: 'white',
                    border: '1px solid #d8d7cf',
                    borderRadius: 14,
                    height: 470,
                    padding: 32,
                }}
            >
                <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h1 style={{ fontSize: 30, margin: 0 }}>Compute</h1>
                    <button
                        style={{
                            background: '#32382f',
                            color: 'white',
                            border: 0,
                            borderRadius: 8,
                            padding: '15px 24px',
                            fontSize: 18,
                        }}
                    >
                        Register Compute
                    </button>
                </header>
                {(screen === 'list' || screen === 'complete') && (
                    <section style={{ marginTop: 40, borderTop: '1px solid #ddd', paddingTop: 24, fontSize: 20 }}>
                        {screen === 'complete'
                            ? 'Demo compute                                      https://192.0.2.10'
                            : 'No compute registered yet'}
                    </section>
                )}
                {(screen === 'metadata' || screen === 'kubeconfig') && (
                    <section
                        style={{
                            position: 'absolute',
                            left: 340,
                            top: 190,
                            width: 600,
                            height: 400,
                            background: '#fafaf8',
                            border: '1px solid #ccc',
                            borderRadius: 12,
                            padding: 30,
                            boxShadow: '0 10px 40px #0002',
                            boxSizing: 'border-box',
                        }}
                    >
                        <h2 style={{ margin: '0 0 20px', fontSize: 26 }}>Register Compute</h2>
                        {screen === 'metadata' ? (
                            <>
                                <p>Name: Demo compute</p>
                                <p>Gateway: https://192.0.2.10</p>
                                <p>Storage: https://192.0.2.11</p>
                            </>
                        ) : (
                            <>
                                <p>Kubeconfig</p>
                                <pre style={{ background: '#eeeee9', padding: 18, fontSize: 17 }}>
                                    {'apiVersion: v1\nkind: Config\n… demo credentials only …'}
                                </pre>
                            </>
                        )}
                        <button
                            style={{
                                position: 'absolute',
                                right: 30,
                                bottom: 20,
                                background: '#32382f',
                                color: 'white',
                                border: 0,
                                padding: '12px 28px',
                                borderRadius: 8,
                                fontSize: 18,
                            }}
                        >
                            {screen === 'metadata' ? 'Next' : 'Register'}
                        </button>
                    </section>
                )}
            </main>
            <footer style={{ marginTop: 26, fontSize: 25, textAlign: 'center' }}>{caption}</footer>
            {click !== undefined && (
                <svg width="100" height="100" style={{ position: 'absolute', left: x - 50, top: y - 50 }}>
                    <circle
                        cx="50"
                        cy="50"
                        r={8 + pulse * 32}
                        fill="none"
                        stroke="#677857"
                        strokeWidth="4"
                        opacity={1 - pulse}
                    />
                </svg>
            )}
            <svg
                width="32"
                height="42"
                viewBox="0 0 32 42"
                style={{ position: 'absolute', left: x, top: y, filter: 'drop-shadow(1px 2px 2px #0005)' }}
            >
                <path d="M2 2L3 33L11 25L17 39L23 36L17 23L29 23Z" fill="white" stroke="#202020" strokeWidth="2" />
            </svg>
        </AbsoluteFill>
    );
}
