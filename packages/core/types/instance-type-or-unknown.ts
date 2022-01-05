// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InstanceTypeOrUnknown<T> = T extends abstract new (...args: any) => infer R ? R : unknown;
