export type JsonLike =
    | string
    | number
    | boolean
    | null
    | undefined
    | { [property: string]: JsonLike }
    | JsonLike[];

export type TransferableJsonLike =
    | string
    | number
    | boolean
    | null
    | undefined
    | { [property: string]: TransferableJsonLike }
    | Transferable
    | TransferableJsonLike[];
