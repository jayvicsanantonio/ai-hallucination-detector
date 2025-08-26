"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentParserFactory = void 0;
const PDFParser_1 = require("./parsers/PDFParser");
const DOCXParser_1 = require("./parsers/DOCXParser");
const TextParser_1 = require("./parsers/TextParser");
const JSONParser_1 = require("./parsers/JSONParser");
class DocumentParserFactory {
    /**
     * Get appropriate parser for the given content type
     */
    static getParser(contentType) {
        const parser = this.parsers.find((p) => p.supports(contentType));
        if (!parser) {
            throw new Error(`No parser available for content type: ${contentType}`);
        }
        return parser;
    }
    /**
     * Get all supported content types
     */
    static getSupportedTypes() {
        const types = new Set();
        this.parsers.forEach((parser) => {
            parser.getSupportedTypes().forEach((type) => types.add(type));
        });
        return Array.from(types);
    }
    /**
     * Check if a content type is supported
     */
    static isSupported(contentType) {
        return this.parsers.some((parser) => parser.supports(contentType));
    }
    /**
     * Register a new parser
     */
    static registerParser(parser) {
        this.parsers.push(parser);
    }
    /**
     * Get all registered parsers
     */
    static getAllParsers() {
        return [...this.parsers];
    }
}
exports.DocumentParserFactory = DocumentParserFactory;
DocumentParserFactory.parsers = [
    new PDFParser_1.PDFParser(),
    new DOCXParser_1.DOCXParser(),
    new TextParser_1.TextParser(),
    new JSONParser_1.JSONParser(),
];
//# sourceMappingURL=DocumentParserFactory.js.map