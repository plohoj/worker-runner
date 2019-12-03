import { Constructor } from "@core/constructor";

export interface IRunnerResolverConfigBase<R extends Constructor> {
    runners: R[];
}
