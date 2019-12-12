import { Constructor } from "@core/types/constructor";

export interface IRunnerResolverConfigBase<R extends Constructor> {
    runners: R[];
}
