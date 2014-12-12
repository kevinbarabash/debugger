import Debugger = require("./debugger");
declare class ProcessingDebugger extends Debugger {
    private _repeater;
    constructor(context: Object, onBreakpoint?: () => void, onFunctionDone?: () => void);
    onMainStart(): void;
    onMainDone(): void;
    static events: string[];
}
export = ProcessingDebugger;
