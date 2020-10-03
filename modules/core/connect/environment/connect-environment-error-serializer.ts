import { JsonObject } from "../../types/json-object";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ConnectEnvironmentErrorSerializer = <T extends JsonObject>(error: any) => T;
