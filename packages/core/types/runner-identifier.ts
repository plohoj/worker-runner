import { RunnerConstructor } from "./constructor";

/**
 * Runner identification token.
 * By default equal to the Runner class name
 */
export type RunnerToken = string;

export type RunnerIdentifier<R extends RunnerConstructor = RunnerConstructor> = RunnerToken | R;

export type IRunnerIdentifierConfig<R extends RunnerConstructor = RunnerConstructor, T extends RunnerToken = RunnerToken> = {
    token: T;
    runner?: R;
}

export type RunnerIdentifierConfigList = ReadonlyArray<IRunnerIdentifierConfig | RunnerConstructor>;

export type AvailableRunnersFromList<L extends RunnerIdentifierConfigList>
    = L extends ArrayLike<infer TOR>
        ? TOR extends IRunnerIdentifierConfig
            ? undefined extends TOR['runner'] 
                ? never
                : TOR['runner']
            : TOR
        : never;

export type AvailableRunnerIdentifier<L extends RunnerIdentifierConfigList = RunnerIdentifierConfigList>
     = AvailableRunnersFromList<L> | RunnerIdentifier;

export type AnyRunnerFromList<L extends RunnerIdentifierConfigList>
    = L extends ArrayLike<infer TOR>
        ? TOR extends IRunnerIdentifierConfig
            ? Exclude<TOR['runner'], undefined>
            : TOR
        : never;

type isLiteralString<T extends string> = string extends T ? false : true;

export type RunnerByToken<L extends RunnerIdentifierConfigList, T extends RunnerToken>
    = isLiteralString<T> extends true
        ? L extends ArrayLike<infer TOR>
            ? TOR extends IRunnerIdentifierConfig
                ? T extends TOR['token']
                    ? isLiteralString<TOR['token']> extends true
                        ? Exclude<TOR['runner'], undefined>
                        : never
                    : never
                : never
            : never
        :never;

type RunnersWithoutLiteralToken<L extends RunnerIdentifierConfigList>
    = L extends ArrayLike<infer TOR>
        ? TOR extends IRunnerIdentifierConfig
            ? isLiteralString<TOR['token']> extends true
                ? never
                : 'runner' extends keyof TOR 
                    ? Exclude<TOR['runner'], undefined>
                    : never
            : TOR
        : never;

export type RunnerByIdentifier<L extends RunnerIdentifierConfigList, I extends RunnerIdentifier>
    = I extends RunnerConstructor
        ? I
        : I extends RunnerToken
            ? RunnerByToken<L, I> extends never
                ? isLiteralString<I> extends true
                    ? RunnersWithoutLiteralToken<L>
                    : AnyRunnerFromList<L>
                : RunnerByToken<L, I>
            : unknown;
