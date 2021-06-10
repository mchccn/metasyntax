import ms from "./ms";
import { Parse, ParseOptions } from "./types";

class Metasyntax<Input extends string, Options extends ParseOptions> {
    private static readonly types = {
        string: /("(?:[^"]|(?<=\\)")*"|'(?:[^']|(?<=\\)')*')/,
        number: /(?<=\s|^)((?:[+-])?(?:\d+(?:\.?\d*)?|\.\d+))(?=\s|$)/,
        boolean: /(true|false)/,
        bigint: /(?<=\s|^)((?:[+-])?(?:\d+))(?=\s|$)/,
        integer: /(?<=\s|^)((?:[+-])?(?:\d+))(?=\s|$)/,
        undefined: /(undefined)/,
        null: /(null)/,
        any: /(.+)/,
        char: /(.)/,
        regex: /(\/(?![*+?])(?:[^\r\n\[/\\]|\\.|\[(?:[^\r\n\]\\]|\\.)*\])+\/)/,
        duration: /((?:-?(?:\d+)?\.?\d+)\s*(?:milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?)/,
        date: /((?:\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+(?:[+-][0-2]\d:[0-5]\d|Z))|(?:\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d(?:[+-][0-2]\d:[0-5]\d|Z))|(?:\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d(?:[+-][0-2]\d:[0-5]\d|Z)))/,
    } as const;

    private static readonly optionals = {
        string: /("(?:[^"]|(?<=\\)")*"\s+|'(?:[^']|(?<=\\)')*'\s+|\s*)/,
        number: /(?<=\s|^)((?:[+-])?(?:\d+(?:\.?\d*)?|\.\d+)\s+|\s*)(?=\s|$)/,
        boolean: /(true\s+|false\s+|\s*)/,
        bigint: /(?<=\s|^)((?:[+-])?(?:\d+)\s+|\s*)(?=\s|$)/,
        integer: /(?<=\s|^)((?:[+-])?(?:\d+)\s+|\s*)(?=\s|$)/,
        undefined: /(undefined\s+|\s*)/,
        null: /(null\s+|\s*)/,
        any: /(.+\s+|\s*)/,
        char: /(.\s+|\s*)/,
        regex: /(\/(?![*+?])(?:[^\r\n\[/\\]|\\.|\[(?:[^\r\n\]\\]|\\.)*\])+\/\s+|\s*)/,
        duration: /((?:-?(?:\d+)?\.?\d+)\s*(?:milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?\s+|\s*)/,
        date: /((?:\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+(?:[+-][0-2]\d:[0-5]\d|Z))|(?:\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d(?:[+-][0-2]\d:[0-5]\d|Z))|(?:\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d(?:[+-][0-2]\d:[0-5]\d|Z))\s+|\s*)/,
    } as const;

    private key = [] as string[];
    private parsed!: RegExp;

    constructor(private metasyntax: Input, private options?: Options) {
        if (!(this instanceof Metasyntax)) throw new Error("Class Metasyntax cannot be extended.");

        this.compile();
    }

    public exec(target: string): Parse<Input, Options> | undefined {
        const matches = Array.from(this.parsed.exec(!this.options?.strict ? target.trim() : target) ?? [])
            .filter(($) => typeof $ !== "undefined")
            .slice(1)
            .map((match) => match.trim());

        if (!matches.length) return undefined;

        return matches.map((match, index) => {
            const type = this.key[index];

            if (["number", "integer", "bigint", "string", "boolean"].includes(type)) {
                if (!match.length) return undefined;

                if (type === "number") return parseFloat(match);

                if (type === "integer") return parseInt(match);

                if (type === "bigint") return BigInt(match);

                if (type === "string") return match;

                if (type === "boolean") return match === "true";
            }

            if (type === "undefined") return undefined;

            if (type === "null") return null;

            if (type === "any") return match;

            if (type === "char") return match;

            if (type === "regex") return new RegExp(match.slice(1, -1));

            if (type === "duration") return ms(match);

            if (type === "date") return new Date(match);

            const defined = this.options?.types?.[type as keyof Metasyntax<Input, Options>["options"]];

            return Array.isArray(defined) ? defined[1](match) : match;
        }) as Parse<Input, Options>;
    }

    public test(target: string) {
        return this.parsed.test(!this.options?.strict ? target.trim() : target);
    }

    public get source() {
        return this.metasyntax;
    }

    private compile() {
        const tokens = this.metasyntax.split(/\s+/).filter(($) => $);

        if (!tokens.length) throw new TypeError("No tokens provided.");

        const compiled = tokens.map((token) => {
            const optional = token.startsWith("[") && token.endsWith("]");

            if (token === "$") {
                if (this.options?.$) {
                    this.key.push("string");

                    return { optional, source: `(${this.options.$.replace(/([.*+?=^!:${}()|[\]\/\\])/g, "\\$1")})` };
                }

                throw new TypeError("Special symbol '$' requires a value to be used.");
            }

            if (!(token.startsWith("[") && token.endsWith("]")) && !(token.startsWith("<") && token.endsWith(">"))) {
                if (token.startsWith("[") || token.startsWith("<"))
                    throw new SyntaxError(
                        `Invalid metasyntax.\nIn token '${token} '\n${" ".repeat("In token ".length + token.length + 1)}^ Expected closing '${token.startsWith("[") ? "]" : ">"}'.`
                    );
                if (token.endsWith("]") || token.endsWith(">"))
                    throw new SyntaxError(`Invalid metasyntax.\nIn token ' ${token}'\n${" ".repeat("In token ".length + 1)}^ Expected opening '${token.endsWith("]") ? "[" : "<"}'.`);

                throw new SyntaxError(
                    `Invalid metasyntax.\nIn token ' ${token} '\n${" ".repeat("In token".length + 1 + 1)}^${" ".repeat(token.length)}^ Expected opening and closing '[]' or '<>'.`
                );
            }

            return {
                optional,
                source: `(?:${Array.from(new Set(token.slice(1, -1).split(/(?<!\\)\|/)))
                    .map((type) => {
                        if (this.options?.aliases?.[type])
                            return Array.from(new Set(this.options.aliases[type].split(/(?<!\\)\|/)))
                                .map((type) => this.parse(type, optional, true))
                                .join("|");

                        return this.parse(type, optional);
                    })
                    .join("|")})`,
            };
        });

        const joined = compiled.reduce(
            (() => {
                let lastWasOptional = false as boolean | undefined;

                return (joined: string, { optional, source }: typeof compiled[number], i: number) => {
                    lastWasOptional = compiled[i - 1]?.optional;

                    return `${joined}${typeof lastWasOptional === "boolean" ? (lastWasOptional ? "" : optional ? "\\s*" : "\\s+") : ""}${source}`;
                };
            })(),
            ""
        );

        this.parsed = new RegExp(this.options?.partial ? joined : `^${joined}$`, "g");

        console.log(this.parsed.source);
    }

    private parse(type: string, optional?: boolean, alias?: boolean) {
        if (this.options?.aliases?.[type] && alias) throw new ReferenceError("Aliases cannot be included in another alias.");

        if (!Metasyntax.types[type as keyof typeof Metasyntax.types] && !Object.keys(this.options?.types ?? {}).includes(type)) throw new TypeError(`Unknown type '${type}'.`);

        this.key.push(type);

        return this.resolve(type, optional);
    }

    private resolve(type: string, optional?: boolean) {
        const defined = this.options?.types?.[type as keyof Metasyntax<Input, Options>["options"]];

        return (
            Metasyntax[optional ? "optionals" : "types"][type as keyof typeof Metasyntax.types]?.source ??
            (Array.isArray(defined) ? defined[0].source : (defined as RegExp)?.source) ??
            (() => {
                throw new ReferenceError("Type was asserted as defined but couldn't be found.");
            })()
        );
    }
}

export default Metasyntax;
module.exports = Metasyntax;
exports = Metasyntax;
