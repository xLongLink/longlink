import { registerRoot, Composition, OffthreadVideo, staticFile } from 'remotion';
import { RegisterCompute } from './RegisterCompute';
import recording from './recording.json';

/** Plays the real Platform recording with its startup frames removed. */
function RealUi() {
    return <OffthreadVideo src={staticFile('real-ui.webm')} trimBefore={recording.trimBefore} muted />;
}

/** Registers the illustrative prototype and real UI recording separately. */
function Root() {
    return (
        <>
            <Composition
                id="RegisterCompute"
                component={RegisterCompute}
                durationInFrames={360}
                fps={30}
                width={1280}
                height={720}
            />
            <Composition
                id="RealCompute"
                component={RealUi}
                durationInFrames={recording.durationInFrames}
                fps={30}
                width={1440}
                height={900}
            />
        </>
    );
}

registerRoot(Root);
