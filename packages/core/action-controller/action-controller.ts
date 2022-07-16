import { BaseConnectionChannel } from '../connection-channels/base.connection-channel';
import { ConnectionClosedError } from '../errors/runner-errors';
import { WorkerRunnerError } from '../errors/worker-runner-error';
import { ActionHandler, IAction, IActionWithId } from '../types/action';
import { DisconnectErrorFactory } from '../types/disconnect-error-factory';

export interface IPromiseMethods<T = unknown, E = unknown> {
    resolve: (data: T) => void;
    reject: (error: E) => void;
}

export interface IActionControllerConfig {
    connectionChannel: BaseConnectionChannel,
    disconnectErrorFactory?: DisconnectErrorFactory;
}

/**
 * Wrapper over the base implementation of the action exchange methods {@link BaseConnectionChannel}.
 * Implements an action identification.
 * Allows to get a promise for actions that are guaranteed to receive one response action.
 * Also allows to track actions by type or ID.
 */
export class ActionController {
    public readonly sendActionResponse: <T extends IAction>(action: T & IActionWithId, transfer?: Transferable[]) => void;
    public readonly addActionHandler: <A extends IAction>(handler: ActionHandler<A>) => void;
    public readonly removeActionHandler: <A extends IAction>(handler: ActionHandler<A>) => void;
    public readonly connectionChannel: BaseConnectionChannel;

    private readonly disconnectErrorFactory: DisconnectErrorFactory;
    private readonly handlersByIdMap = new Map<number, Set<ActionHandler<IActionWithId>>>();
    private readonly resolveActionRejectSet = new Set<(error: unknown) => void>(); 
    // TODO Action Id controller to solve the problem of id intersection when using one worker in several resolvers
    private lastActionId = 0;

    constructor(config: IActionControllerConfig) {
        this.connectionChannel = config.connectionChannel;
        this.sendActionResponse = this.sendAction;
        this.addActionHandler = this.connectionChannel.addActionHandler.bind(this.connectionChannel);
        this.removeActionHandler = this.connectionChannel.removeActionHandler.bind(this.connectionChannel);
        this.disconnectErrorFactory = config.disconnectErrorFactory || this.defaultDisconnectErrorFactory;
    }

    public async resolveAction<I extends IAction = IAction, O extends IAction = IAction>(
        action: I,
        transfer?: Transferable[],
    ): Promise<O & IActionWithId> {
        if (!this.connectionChannel.isConnected) {
            throw this.disconnectErrorFactory(new ConnectionClosedError());
        }
        const actionId = this.resolveActionId();
        const actionWidthId: IActionWithId = {
            ...action,
            id: actionId,
        };
        const response$ = new Promise<O & IActionWithId>((resolve, reject) => {
            const modifiedReject = (error: unknown) => {
                this.removeActionHandlerById(actionId, handler);
                reject(error);
            }
            const handler = (actionResponse: O & IActionWithId) => {
                this.resolveActionRejectSet.delete(modifiedReject);
                this.removeActionHandlerById(actionId, handler);
                resolve(actionResponse);
            }
            this.addActionHandlerById(actionId, handler)
            this.resolveActionRejectSet.add(modifiedReject);
        });
        this.connectionChannel.sendAction(actionWidthId, transfer);
        return response$;
    }

    public sendAction = <T extends IAction>(action: T, transfer?: Transferable[]): void => {
        if (!this.connectionChannel.isConnected) {
            throw this.disconnectErrorFactory(new ConnectionClosedError());
        }
        this.connectionChannel.sendAction(action, transfer);
    }

    /** Initializes event listeners, also calls initialization for the Connection channel */
    public run(): void {
        this.connectionChannel.addActionHandler(this.actionHandler);
        this.connectionChannel.run();
    }

    /** Stops listening to all events and calls the destroy method on the Connection channel */
    public destroy(saveConnectionOpened = false): void {
        this.rejectResolingAllActions();
        this.connectionChannel.destroy(saveConnectionOpened);
        this.handlersByIdMap.clear();
    }

    /** Interrupt resolving all actions and throw an error */
    public rejectResolingAllActions(
        error: WorkerRunnerError = this.disconnectErrorFactory(new ConnectionClosedError())
    ): void {
        for (const reject of this.resolveActionRejectSet) {
            reject(error);
        }
        this.resolveActionRejectSet.clear();
    }

    // TODO it's used anywhere?
    public addActionHandlerById<A extends IAction>(actionId: number, handler: ActionHandler<A>): void {
        let handlers: Set<ActionHandler<IActionWithId>> | undefined = this.handlersByIdMap.get(actionId);
        if (!handlers) {
            handlers = new Set();
            this.handlersByIdMap.set(actionId, handlers);
        }
        handlers.add(handler as unknown as ActionHandler);
    }

    public removeActionHandlerById<A extends IAction>(actionId: number, handler: ActionHandler<A>): void {
        const handlers: Set<ActionHandler<IActionWithId>> | undefined = this.handlersByIdMap.get(actionId);
        if (!handlers) {
            return;
        }
        handlers.delete(handler as unknown as ActionHandler);
        if (handlers.size === 0) {
            this.handlersByIdMap.delete(actionId);
        }
    }

    // TODO Inject id generator
    public resolveActionId(): number {
        return this.lastActionId++;
    }

    private readonly defaultDisconnectErrorFactory = (error: ConnectionClosedError): ConnectionClosedError => {
        return error;
    }

    private readonly actionHandler = (action: IActionWithId) => {
        const handlers = this.handlersByIdMap.get(action.id) || [];
        for (const handler of handlers) {
            handler(action);
        }
    };
}
