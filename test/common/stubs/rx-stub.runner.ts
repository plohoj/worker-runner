import { Observable, of } from 'rxjs';
import { delay as rxDelay } from 'rxjs/Operators';

export class RxStubRunner {
    public emitMessages(messages: string[], delay?: number): Observable<string> {
        if (delay) {
            return of(...messages).pipe((rxDelay(delay)));
        }
        return of(...messages);
    }
}
