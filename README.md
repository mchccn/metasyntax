![Banner](metasyntax.png)

<div align="center">
    <h2>@cursorsdottsx/metasyntax</h2>
    <p>Meta syntax parser in TypeScript.</p>
    <img src="https://forthebadge.com/images/badges/fuck-it-ship-it.svg" />
    <img src="https://forthebadge.com/images/badges/made-with-typescript.svg" />
    <img src="https://forthebadge.com/images/badges/powered-by-black-magic.svg" />
    <img src="https://forthebadge.com/images/badges/60-percent-of-the-time-works-every-time.svg" />
    <img src="https://forthebadge.com/images/badges/fixed-bugs.svg" />
</div>

> Parses strings according to a given metasyntax, providing a cleaner way to parse user input into numbers, booleans, dates, and other objects.
> Easy to learn, easy to use, and a configurable behaviour topped with custom types and aliases.

### Installation and Usage

```bash
# Install with NPM:
$ npm install @cursorsdottsx/metasyntax

# or alternatively, with Yarn:
$ yarn add @cursorsdottsx/metasyntax
```

```js
// Available with CommonJS:
const Metasyntax = require("@cursorsdottsx/metasyntax");

// or with ESM:
import Metasyntax from "@cursorsdottsx/metasyntax";
```

### Documentation

#### **Class `Metasyntax`**

#### `new Metasyntax(metasyntax, options?)`

-   `metasyntax` – The metasyntax to parse.
-   `options` – Options for the instance.
    -   `$` – Placeholder for a string literal.
    -   `types` – Define custom types to use.
        -   `[type: string]: RegExp | [RegExp, (match: string) => unknown]`
    -   `aliases` – Define custom type aliases.
        -   `[alias: string]: string`
    -   `strict` – Strict parsing.
    -   `partial` – Partial parsing.
    -   `case` – Case insensitive parsing.

Creates a new `Metasyntax` instance.

#### `Metasyntax.prototype.test(target)`

-   `target` – Target to test.

Returns true if the target matches the metasyntax, false if otherwise.

#### `Metasyntax.prototype.exec(target)`

-   `target` – Target to parse.

Returns an array of parsed values from the target.

### Typings

This library comes with default typings that are extremely general but work well enough for both JavaScript and TypeScript users.

However, `@cursorsdottsx/metasyntax` comes with a typings file that parses metasyntax using types to provide fine and accurate types for `Metasyntax`.
This parser will obviously slow down your language server, so it is optional. To opt in, add `@cursorsdottsx/metasyntax/types.d.ts` to your `include` paths in your `tsconfig.json`.

If you are using the optional parser, please use `as const` with the options for finer types.

```ts
// Examples of the parser in action:

new Metasyntax("[string] $ <number>", {
    $: "dollar",
} as const).exec("'some string' dollar 1234");
// => [string | undefined, "dollar", number] | undefined

new Metasyntax("[string] $ <number>").exec("'some string' dollar 1234");
// => [string | undefined, {
//        error: "TypeError: Special symbol '$' requires a value to be used."
//    }, number] | undefined

// The parser also works with all the other options, including `aliases` and `types`.
```

### Metasyntax

This flavor of metasyntax is very easy to use and remember.
There are only a few simple guidelines and rules.

**General syntax:**

```
<type|'literal'|"literal"|type()>
[type|'literal'|"literal"|type()]
$
```

**Operators:**

| Operator | Description         |
| -------- | ------------------- |
| `<...>`  | Required arguments. |
| `[...]`  | Optional arguments. |

**Default types:**

| Identifier  | Type        | Description                                                   |
| ----------- | ----------- | ------------------------------------------------------------- |
| `string`    | `string`    | A string wrapped in `'` or `"` (escape with `\`).             |
| `number`    | `number`    | A number in decimal form.                                     |
| `boolean`   | `boolean`   | A boolean (only `true` or `false`).                           |
| `integer`   | `number`    | An integer in decimal form.                                   |
| `bigint`    | `bigint`    | A `BigInt` instance.                                          |
| `any`       | `string`    | Any string of characters that isn't a space.                  |
| `char`      | `string`    | Any character that isn't a space.                             |
| `undefined` | `undefined` | `undefined`                                                   |
| `null`      | `null`      | `null`                                                        |
| `date`      | `Date`      | A date (in ISO form).                                         |
| `duration`  | `number`    | Any duration parsable by [`ms`](https://github.com/vercel/ms) |
| `regex`     | `RegExp`    | A regular expression.                                         |

**Symbols:**

| Symbol | Description                       |
| ------ | --------------------------------- |
| `$`    | Placeholder for a string literal. |

**More:**

-   For array types, use `()` followed by the default type.
    Array types must be last and can be optional.

-   Array types can't be nested (`type()()` is not allowed).

-   Aliases cannot include other aliases to prevent an infinite loop.

### Known bugs or issues

-   The type `string()` has one issue; if a parsed string has a comma in it then the string will be split by the comma, giving incorrectly parsed results.
