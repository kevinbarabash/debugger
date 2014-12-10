/**
 * Interface for the Debugger's delegate.
 * A delegate can be implemented to custom the behaviour of the debugger
 * at key points.  This is used by the ProcessingDelegate to set up event
 * handlers and to cleanup repeating functions such as "draw" when new code
 * is loaded.
 */

interface DebuggerDelegate {
    /**
     * Called when the Debugger's start() method is called, but before
     * any execution occurs.  Provides an opportunity for the delegate to
     * do any initial setup.  This may be called multiple times if code is
     * reloaded and the debugger is restarted.
     *
     * @param debugr
     */
    willStart: (debugr: any) => void;

    /**
     * Called when the debugger has finished running/stepping through the
     * main function.
     *
     * @param debugr
     */
    finishedMainFunction: (debugr: any) => void;

    /**
     * Called after the debugger has finished running/stepping through any
     * function that's running as part of the event loop.  This includes the
     * main function as well as any callbacks for events or any recurring calls
     * such as the "draw" function in processing.js.
     */
    finishedEventLoopFunction: () => void;

    /**
     * Called when a breakpoint has been hit.
     */
    hitBreakpoint: () => void;

    /**
     * Called when a user defined constructor is called to instantiate and object.
     * Used by live-editor to keep track of object instances.
     *
     * @param {Function} classFn - constructor of the object
     * @param {Function} className - name of the constructor
     * TODO: inject code to assign to do classFn.__name = className when the class is defined
     * @param {Object} obj - the object that was constructed
     * @param {Array} args - the arguments that were used when the object was constructed
     */
    objectInstantiated: (classFn: Function, className: string, obj: Object, args: any[]) => void;
}
