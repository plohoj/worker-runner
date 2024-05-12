export enum HeartbeatAction {
    HeartbeatPulse = 'HeartbeatPulse',
}

export interface IHeartbeatPulseAction {
    type: HeartbeatAction.HeartbeatPulse,
}
