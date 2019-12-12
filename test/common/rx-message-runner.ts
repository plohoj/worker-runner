import { Observable, of } from 'rxjs';

export class RxMessageRunner {
    public send(...messages: string[]): Observable<string> {
        return of(...messages);
    }
}
