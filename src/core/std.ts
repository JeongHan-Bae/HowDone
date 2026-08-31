/**
 * @brief Standard implementations for replaceable Core application Ports.
 *
 * @details
 * This entry exposes only implementations that can be supplied to a
 * replaceable application Port. The current entry provides `TypedAstParser`
 * for `MarkdownAstParser`. Consumers may use that standard or replace the Port
 * with another implementation.
 */
export { TypedAstParser } from "./ast/parser.ts";
