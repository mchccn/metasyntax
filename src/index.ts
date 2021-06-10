import escape from "./escape";
import ms from "./ms";
import regex from "./regex";

class Metasyntax {
    private static readonly types = Object.fromEntries(Object.entries(regex).map(([type, regex]) => [type, new RegExp(`(${regex})`)]));

    private static readonly optionals = Object.fromEntries(Object.entries(regex).map(([type, regex]) => [type, new RegExp(`((?:${regex})(?:\\s+|$)|\\s*)`)]));

    private key = [] as string[];
    private parsed!: RegExp;

    constructor(
        private metasyntax: string,
        private options?: {
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
        }
    ) {
        if (!(this instanceof Metasyntax)) throw new Error("Class Metasyntax cannot be extended.");

        this.compile();
    }

    public exec(target: string): unknown[] | undefined {
        const string = ((string) => {
            if (!this.options?.strict) string = string.trim();

            if (this.options?.case) string = string.toLowerCase();

            return string;
        })(target);

        const matches = Array.from(this.parsed.exec(string) ?? [])
            .filter(($) => typeof $ !== "undefined")
            .slice(1)
            .map((match) => match.trim());

        if (!matches.length) return undefined;

        return matches.map((match, index) => {
            const type = this.key[index];

            if (type.endsWith("()")) {
                const array = match
                    .split(/(?<!\\),/)
                    .map((part) => this.transform(type.slice(0, -2), part.trim().replace(/\\,/g, ",")))
                    .filter(($) => typeof $ !== "undefined");

                if (!array.length) return undefined;

                return array;
            }

            return this.transform(type, match);
        });
    }

    public test(target: string) {
        const string = ((string) => {
            if (!this.options?.strict) string = string.trim();

            if (this.options?.case) string = string.toLowerCase();

            return string;
        })(target);

        return this.parsed.test(string);
    }

    public get source() {
        return this.metasyntax;
    }

    private compile() {
        const tokens = this.metasyntax.split(/\s+/).filter(($) => $);

        if (!tokens.length) throw new TypeError("No tokens provided.");

        const compiled = tokens.map((token, index) => {
            const optional = token.startsWith("[") && token.endsWith("]");

            const isLast = index === tokens.length - 1;

            if (token === "$") {
                if (this.options?.$) {
                    this.key.push("string");

                    return { optional, source: `(${this.options.$.replace(/([.*+?=^!:${}()|[\]\/\\])/g, "\\$1")})` };
                }

                throw new TypeError("Special symbol '$' requires a value to be used.");
            }

            if (!(token.startsWith("[") && token.endsWith("]")) && !(token.startsWith("<") && token.endsWith(">"))) {
                if (token.startsWith("[") || token.startsWith("<"))
                    throw new SyntaxError(`Invalid metasyntax.\nIn token '${token} '\n${" ".repeat("In token ".length + token.length + 1)}^ Expected closing '${token.startsWith("[") ? "]" : ">"}'.`);
                if (token.endsWith("]") || token.endsWith(">"))
                    throw new SyntaxError(`Invalid metasyntax.\nIn token ' ${token}'\n${" ".repeat("In token ".length + 1)}^ Expected opening '${token.endsWith("]") ? "[" : "<"}'.`);

                throw new SyntaxError(`Invalid metasyntax.\nIn token ' ${token} '\n${" ".repeat("In token".length + 1 + 1)}^${" ".repeat(token.length)}^ Expected opening and closing '[]' or '<>'.`);
            }

            return {
                optional,
                source: `(?:${Array.from(new Set(token.slice(1, -1).split(/(?<!\\)\|/)))
                    .map((type) => {
                        if (this.options?.aliases?.[type])
                            return Array.from(new Set(this.options.aliases[type].split(/(?<!\\)\|/)))
                                .map((type) => this.parse(type, optional, isLast, true))
                                .join("|");

                        return this.parse(type, optional, isLast);
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
    }

    private transform(type: string, match: string) {
        if (["number", "integer", "bigint", "string", "boolean"].includes(type)) {
            if (!match.length) return undefined;

            if (type === "number") return parseFloat(match);

            if (type === "integer") return parseInt(match);

            if (type === "bigint") return BigInt(match);

            if (type === "string")
                return (match.startsWith("'") && match.endsWith("'")) || (match.startsWith('"') && match.endsWith('"'))
                    ? match.slice(1, -1).replace(match.startsWith("'") ? /\\'/g : /\\"/g, match.startsWith("'") ? "'" : '"')
                    : match;

            if (type === "boolean") return match === "true";
        }

        if (type === "undefined") return undefined;

        if (type === "null") return null;

        if (type === "any") return match;

        if (type === "char") return match;

        if (type === "regex") return new RegExp(match.slice(1, -1));

        if (type === "duration") return ms(match);

        if (type === "date") return new Date(match);

        const defined = this.options?.types?.[type as keyof Metasyntax["options"]];

        return Array.isArray(defined) ? defined[1](match) : match;
    }

    private parse(type: string, optional: boolean, isLast: boolean, alias?: boolean) {
        if (this.options?.aliases?.[type] && alias) throw new ReferenceError(`Aliases cannot be included in another alias.\nAlias '${type}' is included in another alias.`);

        if ((type.startsWith("'") && type.endsWith("'")) || (type.startsWith('"') && type.endsWith('"'))) {
            this.key.push("string");

            return `(${escape(type.slice(1, -1))})`;
        }

        if (type.startsWith('"') || type.endsWith('"')) throw new SyntaxError(`Unterminated string literal.\nIn token '${type}'`);

        if (type.startsWith("'") || type.endsWith("'"))
            throw new SyntaxError(
                `Unterminated string literal.\nIn token '${type.startsWith("'") ? "" : " "}${type}${type.endsWith("'") ? "" : " "}'\n${" ".repeat(
                    "In token".length + (type.startsWith("'") ? type.length + 1 + 1 : 1 + 1)
                )}^ Expected ${type.startsWith("'") ? "closing" : "opening"} '''.`
            );

        if (type.endsWith("()")) {
            if (!isLast) throw new SyntaxError("Array types must be last.");

            this.key.push(type);

            return this.resolve(type, optional, true);
        }

        if (!Metasyntax.types[type as keyof typeof Metasyntax.types] && !Object.keys(this.options?.types ?? {}).includes(type)) throw new TypeError(`Unknown type '${type}'.`);

        this.key.push(type);

        return this.resolve(type, optional);
    }

    private resolve(type: string, optional: boolean, array?: boolean): string {
        const defined = this.options?.types?.[type as keyof Metasyntax["options"]];

        if (array) {
            const item = type.slice(0, -2);

            if (item.endsWith("()")) throw new SyntaxError("Array types can't be nested");

            if (!regex[item as keyof typeof regex]) throw new TypeError(`Unknown type '${type}'.`);

            if (optional) {
                return `((?:${regex[item as keyof typeof regex]}\\s*,\\s*)*(?:${regex[item as keyof typeof regex]})\\s*|\\s*)$`;
            }

            return `((?:${regex[item as keyof typeof regex]}\\s*,\\s*)*(?:${regex[item as keyof typeof regex]}))$`;
        }

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
