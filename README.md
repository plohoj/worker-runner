# Worker Runner

[![Test in Chrome](https://github.com/plohoj/worker-runner/workflows/Test%20in%20Chrome/badge.svg?branch=master)](https://github.com/plohoj/worker-runner/actions?query=workflow%3A%22Test+in+Chrome%22+branch%3Amaster)
[![Test in Firefox](https://github.com/plohoj/worker-runner/workflows/Test%20in%20Firefox/badge.svg?branch=master)](https://github.com/plohoj/worker-runner/actions?query=workflow%3A%22Test+in+Firefox%22+branch%3Amaster)
[![Test in IE11](https://github.com/plohoj/worker-runner/workflows/Test%20in%20IE11/badge.svg?branch=master)](https://github.com/plohoj/worker-runner/actions?query=workflow%3A%22Test%20in%20IE11%22+branch%3Amaster)
[![npm version](https://badge.fury.io/js/%40worker-runner%2Fcore.svg)](https://www.npmjs.com/search?q=%40worker-runner)

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
1. [Warning](#warning)

## <a name="initialization"></a> Initialization
Declare your classes with the methods you need.
``` ts
export class LibraryRunner { // Example Runner
    public books: string[]
    constructor (books: string[]) { // Constructor can take arguments
        this.books = books;
    }

    public addBook(book: string): void {
        this.books.push(book);
    }

    // The method can return a result
    public checkBook(book: string): boolean {
        return this.books.includes(book);
    }

    // The method can return result asynchronously
    public reserveBook(book: string, time: number): Promise<string> {
        return new Promise(resolve => setTimeout(() => resolve(book), time));
    }
}
```
Declare your control instance of `ClientRunnerResolver` in a **main area**.
* The control instance must be declared with a list of Runner classes that will be executed in the workspace.
* You must wait until the **asynchronous** call to the `run()` method completes.
``` ts
// Main area
import { ClientRunnerResolver } from '@worker-runner/promise';

const resolver = new ClientRunnerResolver({
    runners: [LibraryRunner],
    connection: new Worker('./worker.js'),
});
resolver.run(); // await asynchronous
```
And also declare your control instance of `HostRunnerResolver` in a **worker area**.
* The control instance must also have a list of Runner classes. This list **may differ** from the list used in `ClientRunnerResolver`.
* Call the `run()` method.
``` ts
// Worker area
import { HostRunnerResolver } from '@worker-runner/promise';

new HostRunnerResolver({ runners: [LibraryRunner] }).run();
```
## <a name="usage"></a> Usage
After you initialized `ClientRunnerResolver` *(in main area)* and `HostRunnerResolver` *(in worker area)*, you can use the control instance to resolve instances of the Runner class that will be used in the main area and executed in the worker area.
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

*   <a name="destroy"></a> **`destroy()`**  
    Destroying and remove Runner instance from resolved Runners list in `RunnerResolver` instance.

*   <a name="disconnect"></a> **`disconnect()`**  
    Unsubscribe from runner, if the control object was the last, then runner will be automatically destroyed.

*   <a name="clone-control"></a> **`cloneControl()`**  
    Returns a new control object for the same Runner instance.

*   <a name="mark-for-transfer"></a> **`markForTransfer()`**  
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
`LocalRunnerResolver` can be used to replace `ClientRunnerResolver` to simplify debugging in development mode and for testing.  
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
const resolver = new RxClientRunnerResolver({
    runners: [LibraryRunner],
    connection: new Worker('./worker.js'),
});
await resolver.run();
const libraryRunner = await resolver.resolve(LibraryRunner);
(await libraryRunner.notification()).subscribe(() => {
    // ...
})
```

## <a name="warning"></a> Warning

* Internet Explorer requires **polyfill** for `Promise`.
* Unfortunately the generic type cannot handle the `interface` correctly, **but** it does work correctly with `type alias` and `class`. Therefore, it is recommended to use `type alias` instead of `interface` to describe the type of your method arguments.
* The library is compiled using the **ES2015** standard. If you need support for **older browsers** such as **Internet Explorer**, then you will need to recompile the library using **ES5** and **Promise plolyffil**. You can see an **[example of configuring webpack here](https://github.com/plohoj/worker-runner-webpack-example)**.

