export class RunnerWithConstructorError {
    constructor() {
        throw new Error('In constructor error');
    }
}