interface RocketRMLOptions {
    // jsonld @context for json-ld compress
    compress?: any;
    // output triples instead of json-ld
    toRDF?: boolean;
    // jsonld only: replace @ids with elements
    replace?: boolean;
    // remove xmlns in xml documents (for easier xPaths)
    removeNameSpace?: Record<string, string>;
    // xpath evaluator library
    xpathLib?: "default" | "xpath" | "pugixml" | "fontoxpath";
    // functions
    functions?: Record<string, Function>;
    // add no triples for empty strings
    ignoreEmptyStrings?: boolean;
}

export function parseFile(mappingFilePath: string, outputPath: string, options?: RocketRMLOptions): Promise<any>;

export function parseFileLive(mappingFile: string, inputFiles: Record<string, string>, options?: RocketRMLOptions): Promise<any>;
