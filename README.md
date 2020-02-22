# Worker Runner
A tool to assist in using Web Worker.
## Usage
Declare your classes with the methods you need.
``` ts
export class LibraryRunner {
    public books: string[]
    constructor (books: string[]) {
        this.books = books;
    }

    public addBook(book: string): void {
        this.books.push(book);
    }

    public checkBook(book: string): boolean {
        return this.books.indexOf(book) !== -1;
    }

    public reserveBook(book: string, time: number): Promise<string> {
        return new Promise(resolve => setTimeout(() => resolve(book), time))
    }
}
```
Declare your control instance of WorkerResolver in a common module. The control instance must be declared with specific classes that will be executed in the workspace.
``` ts
import { RunnerResolver } from '@worker-runner/promise';

export const resolver = new RunnerResolver({runners: [LibraryRunner]});
```
Import your control instance anywhere in the code, as well as in the Worker area. Call the `run()` and `runInWorker()` method.
``` ts
// Main area
import { resolver } from "./common";
// ...
resolver.run();

// Worker area
import { resolver } from "./common";
// ...
resolver.runInWorker();
```
Now you can use the control instance to resolve instances of the Runner class that will be used in the main area and executed in the worker area.
``` ts
async function main() {
    await resolver.run();
    const libraryRunner = await resolver.resolve(LibraryRunner, ['Book №1']);

    await libraryRunner.addBook('Book №2');

    const isExist = await libraryRunner.checkBook('Book №2');
    console.log('Book №2 exist:', isExist); // => Book №2 exist: true

    const reservedBook = await libraryRunner.reserveBook('Book №1', 100);
    console.log('Reserve ended for:', reservedBook); // => Reserve ended for: Book №1

    await libraryRunner.destroy();
}
main();
```
### Resolved instance as argument
You can use the resolved instance as constructor or methods arguments. Resolved instance **can be declared in another worker**
``` ts
export class LibraryPoolRunner {
    // ...
    constructor(...libraries: ResolveRunner<LibraryRunner>[]) {
        // ...
    }

    addLibrary(library: ResolveRunner<LibraryRunner>): void {
        // ...
    }
}
// ...
const libraryRunners = await Promise.all([
    resolver1.resolve(LibraryRunner, []),
    resolver2.resolve(LibraryRunner, []),
]);
const libraryPoolRunner = await resolver3.resolve(LibraryPoolRunner, libraryRunners[0]);
await libraryPoolRunner.addLibrary(libraryRunners[1]);
```
### RxJS
You can also use RxJS Observable to receive events from worker. To do this, use the `@worker-runner/rx` library.
``` ts
export class LibraryRunner {
    private notification$ = new Subject<string>();
    // ...
    public notification(): Observable<string> {
        return this.notification$;
    }
}
// ...
const libraryRunner = await resolver.resolve(LibraryRunner);
(await libraryRunner.notification()).subscribe(() => {
    // ...
})
```