type Split<Input, Separator extends string = ""> = 
    Input extends ""
        ? []
        : Input extends `${infer Start}${Separator}${infer End}`
            ? Start extends `${infer Start}\\`
                ? JoinToFirst<`${Start}${Separator}`, Split<End, Separator>>
                : [Start, ...Split<End, Separator>]
            : [Input];

type JoinToFirst<Start extends string, Rest extends readonly string[]> = 
    Rest extends [infer First, ...infer Rest] 
        ? [`${Start}${First & string}`, ...Rest] 
        : [Start];

type WhiteSpaceCharacter = " " | "\n";

type StringTerminator = "\"" | "'";

type TrimEnd<T extends string> = T extends `${infer Rest}${WhiteSpaceCharacter}` ? TrimEnd<Rest> : T;
type TrimStart<T extends string> = T extends `${WhiteSpaceCharacter}${infer Rest}` ? TrimStart<Rest> : T;

type Trim<T extends string> = TrimEnd<TrimStart<T>>;

type TypeMap = {
    string: string;
    number: number;
    boolean: boolean;
    date: Date;
    bigint: bigint;
    undefined: undefined;
    null: null;
    any: string;
    char: string;
    duration: number;
    integer: number;
    regex: RegExp;
};

type ReturnValue<T> = T extends (...args: any) => infer R ? R : any

type ResolveTypeInternal<T extends string, IsLast extends boolean, Options extends ParseOptions, InArray extends boolean = false, InAlias extends boolean = false> = 
    T extends keyof TypeMap
        ? TypeMap[T]
        : T extends `${infer Type}()`
            ? IsLast extends true
                ? InArray extends true
                    ? { error: "SyntaxError: Array types can't be nested." }
                    : ResolveTypeInternal<Type, IsLast, Options, true> extends `${infer ErrorType}Error: ${infer ErrorMessage}`
                        ? ResolveTypeInternal<Type, IsLast, Options, true>
                        : ResolveTypeInternal<Type, IsLast, Options, true>[]
                : { error: "SyntaxError: Array types must be last." }
            : T extends `"${infer String}"`
                ? String
                : T extends `'${infer String}'`
                    ? String
                    : T extends `${StringTerminator}${string}`
                        ? { error: "SyntaxError: Unterminated string literal." }
                        : T extends `${string}${StringTerminator}`
                               ? { error: "SyntaxError: Unterminated string literal." }
                                : T extends keyof Options["types"]
                                    ? Options["types"][T] extends [RegExp, infer Callback]
                                        ? ReturnValue<Callback>
                                        : unknown
                                    : T extends keyof Options["aliases"]
                                        ? InAlias extends true
                                            ? { error: "ReferenceError: Aliases cannot be included in another alias." }
                                            : ResolveTypeHelper<Split<Options["aliases"][T], "|">, IsLast, Options, true>[number]
                                        : unknown;

type ResolveTypeHelper<A, IsLast extends boolean, Options extends ParseOptions, InAlias extends boolean = false> = 
    A extends [infer Head, ...infer Rest] 
        ? [ResolveTypeInternal<Trim<Head & string>, IsLast, Options, false, InAlias>, ...ResolveTypeHelper<Rest, IsLast, Options, InAlias>] 
        : []

type ResolveType<T extends string, IsLast extends boolean, Options extends ParseOptions> = ResolveTypeHelper<Split<T, "|">, IsLast, Options>;

type ParseInternal<S extends string, Options extends ParseOptions, Results extends unknown[] = []> = 
    S extends `[${infer Types}]${infer Rest}`
        ? ParseInternal<Trim<Rest>, Options, [...Results, ResolveType<Types, Rest extends "" ? true : false, Options>[number] | undefined]> 
        : S extends `<${infer Types}>${infer Rest}`
            ? ParseInternal<Trim<Rest>, Options, [...Results, ResolveType<Types, Rest extends "" ? true : false, Options>[number]]>
            : S extends `\$${infer Rest}`
                ? Options["$"] extends string
                    ? ParseInternal<Trim<Rest>, Options, [...Results, Options["$"]]>
                    : Options["$"] extends undefined | unknown
                        ? ParseInternal<Trim<Rest>, Options, [...Results, { error: "TypeError: Special symbol '$' requires a value to be used." }]>
                        : S extends ""
                            ? Results
                            : [...Results, { error: "SyntaxError: Invalid metasyntax." }]
                : S extends ""
                    ? Results
                    : [...Results, { error: "TypeError: Option '$' must be of type string."}]

type Parse<
    S extends string,
    Options extends ParseOptions = {
        $: undefined;
        strict: true;
    }
> = ParseInternal<Options["strict"] extends true ? Trim<S> : S, Options>;

type ParseOptions = {
    readonly $?: string;
    readonly types?: {
        readonly [type: string]: RegExp | readonly [RegExp, (match: string) => unknown];
    };
    readonly aliases?: {
        readonly [alias: string]: string;
    };
    readonly strict?: boolean;
    readonly partial?: boolean;
    readonly case?: boolean;
};

declare module "@cursorsdottsx/metasyntax" {
    export default class Metasyntax<Input extends string, Options extends ParseOptions> {
        private static readonly types: { readonly [type: string]: RegExp };
        private static readonly optionals: { readonly [type: string]: RegExp };

        private metasyntax: Input;
        private options?: Options;
        private key: string[];
        private parsed: RegExp;

        constructor(metasyntax: Input, options?: Options | undefined);

        exec(target: string): Parse<Input, Options> | undefined;
        test(target: string): boolean;

        get source(): Input;

        private compile(): void;
        private transform(): unknown;
        private parse(): string;
        private resolve(): string;
    }
}