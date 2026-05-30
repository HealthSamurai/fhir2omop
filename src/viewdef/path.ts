// FHIRPath wrapper — mirrors sof-js/src/path.js.
//
// Provides:
//   • a `rewrite_path` step that translates `.ofType(Type)` into the explicit
//     `valueType` property accessor (we don't load FHIR models)
//   • two custom invocation table entries — getResourceKey, getReferenceKey —
//     used by ViewDefinitions that need cross-resource joins
//   • a `$this` → `identity()` rewrite so paths beginning with $this work
//
// Exposed as ctx.fns.viewdef.path(ctx, { resource, path, constants? }) for
// REPL debugging. Library users (run, normalize) call evaluate() directly.

import fhirpath from "fhirpath";

function getResourceKey(nodes: any[]): any[] {
    return nodes.flatMap((node) => [node.id]);
}

function getReferenceKey(nodes: any[], opts?: { name?: string }): any[] {
    const resource = opts?.name;
    return nodes.flatMap((node) => {
        const ref: string = node.reference;
        if (!ref) return [];
        // urn:uuid:xxx / urn:oid:xxx — Bundle-internal references; key is the
        // value after the last colon (no resource type to filter on).
        if (ref.startsWith("urn:")) {
            const key = ref.slice(ref.lastIndexOf(":") + 1);
            return resource ? [] : [key];
        }
        const parts = ref.replaceAll("//", "").split("/_history")[0]!.split("/");
        const type = parts[parts.length - 2];
        const key = parts[parts.length - 1];
        if (!resource) return [key];
        if (resource === type) return [key];
        return [];
    });
}

const FHIRPATH_OPTS = {
    userInvocationTable: {
        getResourceKey: { fn: getResourceKey, arity: { 0: [] as any[] } },
        getReferenceKey: { fn: getReferenceKey, arity: { 0: [] as any[], 1: ["TypeSpecifier"] as any[] } },
        identity: { fn: (nodes: any[]) => nodes, arity: { 0: [] as any[] } },
    },
};

function rewrite_path(path: string): string {
    if (path.startsWith("$this")) {
        path = "identity()" + path.slice("$this".length);
    }
    const ofTypeRegex = /\.ofType\(([^)]+)\)/g;
    let match: RegExpExecArray | null;
    while ((match = ofTypeRegex.exec(path)) !== null) {
        const replacement = match[1]!.charAt(0).toUpperCase() + match[1]!.slice(1);
        path = path.replace(match[0], `${replacement}`);
    }
    return path;
}

function process_constants(constants: any[]): Record<string, any> {
    return constants.reduce((acc, x) => {
        let name: string | undefined;
        let val: any;
        for (const key in x) {
            if (key === "name") name = x[key];
            if (key.startsWith("value")) val = x[key];
        }
        if (name !== undefined) acc[name] = val;
        return acc;
    }, {} as Record<string, any>);
}

export function evaluate(data: any, path: string, constants: any[] = []): any[] {
    return fhirpath.evaluate(data, rewrite_path(path), process_constants(constants), undefined, FHIRPATH_OPTS);
}

// Function entrypoint registered as ctx.fns.viewdef.path
export default function (
    _ctx: Context,
    opts: { resource: any; path: string; constants?: any[] },
): any[] {
    return evaluate(opts.resource, opts.path, opts.constants ?? []);
}
