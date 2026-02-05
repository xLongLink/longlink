import { useParams } from "react-router";

export function ModuleRouter() {
    const { module, "*": rest } = useParams();

    return (
        <div>
            <h1>Module: {module}</h1>
            <p>Subpath: {rest}</p>

            {/* here you can dispatch to tool-specific routing */}
        </div>
    );
}