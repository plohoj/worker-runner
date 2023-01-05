export type FilterString<
    Text extends string,
    Filters extends string[],
    TrueResult,
    FalseResult = never,
    EmptyFilterResult = TrueResult
>
    = Filters extends [infer First extends string, ...infer Other extends string[]]
        ? Text extends `${string}${First}${string}`
            ? Other extends []
                ? TrueResult
                : FilterString<Text, Other, TrueResult, FalseResult>
            : FalseResult
        : Filters extends []
            ? EmptyFilterResult 
            : Filters extends (infer ArrayType extends string)[]
                ? Text extends `${string}${ArrayType}${string}`
                    ? TrueResult
                    : FalseResult
                : FalseResult;
