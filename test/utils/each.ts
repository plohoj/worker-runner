export function each<T>(instances: Record<string, T>, callback: (name: string, instances: T) => void): void {
    Object.entries(instances).forEach(([name, instance]) => callback(name, instance));
}