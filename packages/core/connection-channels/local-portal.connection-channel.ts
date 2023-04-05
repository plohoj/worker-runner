import { IAction } from '../types/action';
import { BaseConnectionChannel } from './base.connection-channel';

// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop(){}

export class LocalPortalConnectionChannel extends BaseConnectionChannel {

    protected override nativeSendAction: (data: IAction, transfer?: Transferable[]) => void = noop; 

    private target!: LocalPortalConnectionChannel;

    private constructor() {
        super();
    }

    public static build(): [first: LocalPortalConnectionChannel, second: LocalPortalConnectionChannel] {
        const first = new LocalPortalConnectionChannel();
        const second = new LocalPortalConnectionChannel();
        first.target = second;
        second.target = first;
        return [first, second];
    }

    public override run(): void {
        super.run();
        this.target.nativeSendAction = this.actionHandler;
    }

    protected override afterDestroy(): void {
        this.target.nativeSendAction = noop;
        super.afterDestroy();
    }
}
