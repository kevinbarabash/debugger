/**
 * Interface for the Debugger's delegate.
 * A delegate can be implemented to custom the behaviour of the debugger
 * at key points.  This is used by the ProcessingDelegate to set up event
 * handlers and to cleanup repeating functions such as "draw" when new code
 * is loaded.
 */

interface DebuggerDelegate {
    /**
     * Called whenever the Debugger's start() method is called, but before
     * any execution occurs.  Provides an opportunity for the delegate to
     * do any initial setup.  This may be called multiple times if code is
     * reloaded and the debugger is restarted.
     *
     * @param debugr
     */
    debuggerWillStart: (debugr: any) => void;

    /**
     * Called after the debugger has finished running/stepping through the
     * main function.
     *
     * @param debugr
     */
    debuggerFinishedMain: (debugr: any) => void;
}
