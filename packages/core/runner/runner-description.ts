import { IRunnerMessageConfig } from '../errors/error-message';
import { RunnerToken } from '../types/runner-identifier';

export interface IRunnerDescription extends IRunnerMessageConfig {
    token: RunnerToken;
    runnerName?: string;
}
