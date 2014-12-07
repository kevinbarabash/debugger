interface GeneratorResult<T> {
    done: boolean;
    value: T;
}

interface GeneratorObject<T> {
    next: (value: any) => GeneratorResult<T>
}
