type ActionAreaType = 'client' | 'host';
type ActionDirectionType = 'in' | 'out';
type ActionAreaDirectionType = `${ActionAreaType}-${ActionDirectionType}`;

const areaToLog: Record<ActionAreaType, string> = {
    client: 'C',
    host: 'H'
};
const directionToLog: Record<ActionDirectionType, string> = {
    in: '<<<',
    out: '>>>'
};

export function actionLog(areaDirection: ActionAreaDirectionType, action: unknown) {
    const logData: unknown[] = [];
    const [area, direction] = areaDirection.split('-') as [ActionAreaType, ActionDirectionType];
    logData.push(`${areaToLog[area]}${directionToLog[direction]}`);

    if (action && typeof action === 'object' && 'type' in action) {
        const type = (action as {type: unknown}).type;
        if (typeof type === 'string') {
            logData.push(type);
        }
        if ('payload' in action && typeof (action as {payload: unknown}).payload === 'object') {
            const payload: object = (action as {payload: object}).payload;
            if ('type' in payload && typeof (payload as {type: unknown}).type === 'string') {
                logData.push((payload as  {type: string}).type);
            }
        }
    }
    logData.push(action);
    // console.log(...logData);
}
