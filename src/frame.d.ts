interface YieldValue {
    gen: GeneratorObject<YieldValue>;
    line: number;
    stepAgain?: boolean;
    scope?: Object;
    name?: string;
}

interface Frame {
    gen: GeneratorObject<YieldValue>;
    line: number;
    name?: string;
    scope?: Object;
}
