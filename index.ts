class Metasyntax {
    private static TYPES = {
        string: /"(?:[^"]|(?<!\\)")*"|'(?:[^']|(?<!\\)')*'/g,
        number: /(?<=\s|^)([+-])?(\d+(?:\.?\d*)?|\.\d+)(?=\s|$)/g,
        boolean: /(true|false)/g,
    } as const;

    constructor(
        private metasyntax: string,
        private options?: {
            $?: string;
            types?: {
                [type: string]: RegExp;
            };
        }
    ) {
        this.compile();
    }

    private compile() {
        const parsed = [];

        const tokens = this.metasyntax.split(/\s+/);

        tokens.forEach((token) => {
            const pattern = token.slice(1, -1);

            const matchers = pattern.split(/(?<!\\)\|/);

            if (token.startsWith("[") && token.endsWith("]")) {
            }

            if (token.startsWith("<") && token.endsWith(">")) {
            }

            throw new SyntaxError("Invalid metasyntax.");
        });
    }

    get source() {
        return this.metasyntax;
    }
}

new Metasyntax("ok");
