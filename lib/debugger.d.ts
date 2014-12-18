/// <reference path="../src/generators.d.ts" />
import Stepper = require("./stepper");
import Scheduler = require("../external/scheduler/lib/scheduler");
declare class Debugger {
    context: any;
    scheduler: Scheduler;
    breakpoints: {
        [x: number]: boolean;
    };
    breakpointsEnabled: boolean;
    mainGeneratorFunction: GeneratorFunction<any>;
    onBreakpoint: () => void;
    onFunctionDone: () => void;
    private _paused;
    private done;
    constructor(context: Object, onBreakpoint?: () => void, onFunctionDone?: () => void);
    static isBrowserSupported(): any;
    load(code: string): void;
    start(paused: any): void;
    queueGenerator(gen: Function): void;
    resume(): void;
    stepIn(): void;
    stepOver(): void;
    stepOut(): void;
    stop(): void;
    paused: boolean;
    currentStack: {
        name: string;
        line: number;
    }[];
    currentScope: Object;
    currentLine: number;
    line: number;
    setBreakpoint(line: number): void;
    clearBreakpoint(line: number): void;
    private _currentStepper;
    _createStepper(genObj: GeneratorObject<any>, isMain?: boolean): Stepper;
    onMainStart(): void;
    onMainDone(): void;
    onNewObject(classFn: Function, className: string, obj: Object, args: any[]): void;
}
export = Debugger;
