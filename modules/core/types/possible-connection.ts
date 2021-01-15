export type WorkerRunnerPossibleConnection = Worker | ServiceWorker | SharedWorker | MessagePort;

export type IWorkerRunnerPossibleConnectionConfig = {
    connection: WorkerRunnerPossibleConnection;
};
