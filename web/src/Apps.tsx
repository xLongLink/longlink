import { useParams } from "react-router";


// A router component for handling paths under <org>/apps/*

export function AppsRouter() {
    const { apps, "*": rest } = useParams();

    console.log("AppsRouter params:", { apps, rest });

    return (
        <div>
            <h1>Apps: {apps}</h1>
            <p>Subpath: {rest}</p>

            {/* here you can dispatch to tool-specific routing */}
        </div>
    );
}