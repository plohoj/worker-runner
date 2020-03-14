# Worker Runner
Worker Runner is a tool to assist use Web Worker.

## Table of contents
1. [Initialization](#initialization)
1. [Usage](#usage)
1. [Resolved Runner](#resolved-runner)
    * [destroy](#destroy)
    * [disconnect](#disconnect)
    * [cloneControl](#clone-control)
    * [markForTransfer](#mark-for-transfer)
1. [Resolved Runner as argument](#resolved-runner-as-argument)
1. [LocalRunnerResolver](#localrunnerresolver)
1. [Resolved Runner as method result](#resolved-runner-as-method-result)
1. [Transfer data](#transfer-data)
1. [Usage with RxJs](#usage-with-rxjs)

## <a name="initialization"></a> Initialization
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
Declare your control instance of `RunnerResolver` in a common module. The control instance must be declared with Runner classes that will be executed in the workspace.
``` ts
import { RunnerResolver } from '@worker-runner/promise';

export const resolver = new RunnerResolver({runners: [LibraryRunner]});
```
Import your `RunnerResolver` instance anywhere in the code, as well as in the Worker area. Call the `run()` and `runInWorker()` method.
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
You can use different `RunnerResolver` instances in the main area and in the WebWorker area, the main thing is that the **Runner list is the same**
## <a name="usage"></a> Usage
After you initialized `RunnerResolver`, you can use the control instance to resolve instances of the Runner class that will be used in the main area and executed in the worker area.
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
## <a name="resolved-runner"></a> Resolved Runner
Runner that was resolved by `RunnerResolver` has the same methods as the original Runner instance.
All called methods will be executed asynchronously and the result of the calculation will be obtained using Promise.  
Resolved Runner also has a set of methods:

*   ### <a name="destroy"></a> **`destroy()`**  
    Destroying and remove Runner instance from resolved Runners list in `RunnerResolver` instance.

*   ### <a name="disconnect"></a> **`disconnect()`**  
    Unsubscribe from runner, if the control object was the last, then runner will be automatically destroyed.

*   ### <a name="clone-control"></a> **`cloneControl()`**  
    Returns a new control object for the same Runner instance.

*   ### <a name="mark-for-transfer"></a> **`markForTransfer()`**  
    When a Runner is flagged for transfer, if it is used 
    [as argument](#resolved-runner-as-argument) or as [method result](#resolved-runner-as-method-result),
    the original control will be transferred. The original Resolved Runner will lose control.
    In this case, the transfer of the Resolved Runner will be faster
    because it will not take time to request a copy of the control.
    It is convenient to use as an automatic disconnect after returning the result of a method.

## <a name="resolved-runner-as-argument"></a> Resolved Runner as argument
You can use the resolved instance as constructor or methods arguments. Resolved instance **can be declared in another `RunnerResolver` and area**.
``` ts
export class LibraryPoolRunner {
    // ...
    constructor(...libraries: ResolvedRunner<LibraryRunner>[]) {
        // ...
    }

    addLibrary(library: ResolvedRunner<LibraryRunner>): void {
        // ...
    }
}
// ...
const libraryRunners = await Promise.all([
    resolver1.resolve(LibraryRunner, []),
    resolver2.resolve(LibraryRunner, []),
]);
const libraryPoolRunner = await resolver3
    .resolve(LibraryPoolRunner, libraryRunners[0]);
await libraryPoolRunner.addLibrary(libraryRunners[1]);
```
## <a name="localrunnerresolver"></a> LocalRunnerResolver
The original Runner instance will run in the same area in which it was resolved / wrapped.
`LocalRunnerResolver` can be used to replace `RunnerResolver` to simplify debugging in development mode and for testing.  
That allows to use a local Runner as [method result](#resolved-runner-as-method-result) or pass it [as argument](#resolved-runner-as-argument).
``` ts
// ...
const resolvedLibraryPoolRunner = await resolver.resolve(LibraryPoolRunner);
const localResolver = new LocalRunnerResolver({
    runners: [LibraryRunner, LibraryPoolRunner]
});
const resolvedLibraryRunner = await localResolver.resolve(LibraryRunner, []);
resolvedLibraryPoolRunner.addLibrary(resolvedLibraryRunner);
resolvedLibraryRunner.disconnect();
// ...
```
**WARNING**: Remember to call the [`disconnect()`](#disconnect) or [`destroy()`](#destroy) method, as appropriate, to avoid **memory leaks**.

## <a name="resolved-runner-as-method-result"></a> Resolved Runner as method result
If the method returns the Resolved Runner as the return value, then its control object will be copied and transferred.  
``` ts
export class LibraryPoolRunner {
    // ...
    public resolveLibrary(id: number): ResolvedRunner<LibraryRunner> {
        return this.resolvedLibraryRunners[id];
    }
}
```
**WARNING**: If you want the Resolved Runner to be **automatically disconnected** after returning the result of the method, in order to avoid **memory leak**, call the [`markForTransfer()`](#mark-for-transfer) method, in which case the control will not be copied, but transferred. At the same time, the original Resolved Runner **will lose control**.
``` ts
export class LibraryPoolRunner {
    // ...
    public resolveLibrary(id: number): ResolvedRunner<LibraryRunner> {
        return this.localResolver
            .wrapRunner(this.libraryRunners[id])
            .markForTransfer();
    }
}
```

## <a name="transfer-data"></a> Transfer data
If you need to use Transferable data as an argument or as a result of a method,
wrap such data in the `TransferRunnerData` class.
```ts
export class ArrayBufferRunner {
    // ...
    public resolveLibrary(
        id: number,
        data: ArrayBuffer,
    ): TransferRunnerData<{ id: number, data: ArrayBuffer}, ArrayBuffer> {
        // ...
        return new TransferRunnerData({ id, data}, [data]);
    }
}
// ...
const arrayBuffer = new ArrayBuffer(8);
// ...
resolvedArrayBufferRunner
    .resolveLibrary(0, new TransferRunnerData(arrayBuffer, [arrayBuffer]),
);

```

## <a name="usage-with-rxjs"></a> Usage with RxJs
You can also use RxJS Observable *(or Subject)* to receive events from worker. To do this, use the [`@worker-runner/rx`](https://www.npmjs.com/package/@worker-runner/rx) library.
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