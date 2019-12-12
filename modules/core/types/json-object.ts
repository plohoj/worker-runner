export type JsonObject =
    | string
    | number
    | boolean
    | null
    | undefined
    | { [property: string]: JsonObject }
    | JsonObject[];
