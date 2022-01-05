export type JsonObject =
    | string
    | number
    | boolean
    | null
    | undefined
    | { [property: string]: JsonObject }
    | JsonObject[];

export type TransferableJsonObject =
    | string
    | number
    | boolean
    | null
    | undefined
    | { [property: string]: TransferableJsonObject }
    | Transferable
    | TransferableJsonObject[];
