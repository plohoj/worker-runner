import { JsonObject } from "../../types/json-object";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IConnectControllerErrorDeserializer = <E extends JsonObject>(error: E) => any;
