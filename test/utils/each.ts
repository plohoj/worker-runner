export function each<T>(instances: Record<string, T>, callback: (name: string, instance: T) => void): void {
    for (const [name, instance] of Object.entries(instances)) {
        callback(name, instance);
    }
}
