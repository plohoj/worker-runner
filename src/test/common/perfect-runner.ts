import { SimpleRunner } from "./simple-runner";

export class PerfectRunner extends SimpleRunner {
    public perfectRun(): string {
        return 'Hello from perfect runner';
    }

    public promiseMessage(): Promise<string> {
        return new Promise(resolve => {
            setTimeout(() => resolve('Message width Delay'), 1000);
        })
    } 
}