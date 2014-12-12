/// <reference path="../src/generators.d.ts" />
/// <reference path="../src/frame.d.ts" />
import basic = require("../node_modules/basic-ds/lib/basic");
import Task = require("../external/scheduler/lib/task");
declare class Stepper implements Task {
    breakCallback: () => void;
    doneCallback: () => void;
    breakpointsEnabled: boolean;
    private _breakpoints;
    stack: basic.Stack<Frame>;
    private _started;
    private _paused;
    private _stopped;
    private _retVal;
    constructor(genObj: any, breakpoints: {
        [x: number]: boolean;
    }, breakCallback: () => void, doneCallback: () => void);
    stepIn(): string;
    stepOver(): string;
    stepOut(): string;
    start(paused?: boolean): void;
    resume(): void;
    private _run();
    setBreakpoint(line: number): void;
    clearBreakpoint(line: number): void;
    started: boolean;
    stopped: boolean;
    line: number;
    private _step();
    private _runScope(gen);
    private _popAndStoreReturnValue(value);
}
export = Stepper;
