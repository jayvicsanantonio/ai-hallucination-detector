"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FactChecker = void 0;
// Fact-checking module exports
__exportStar(require("./interfaces/FactChecker"), exports);
__exportStar(require("./interfaces/KnowledgeBase"), exports);
__exportStar(require("./interfaces/ExternalKnowledgeSource"), exports);
var FactChecker_1 = require("./FactChecker");
Object.defineProperty(exports, "FactChecker", { enumerable: true, get: function () { return FactChecker_1.FactChecker; } });
__exportStar(require("./MockKnowledgeBase"), exports);
__exportStar(require("./ClaimExtractor"), exports);
__exportStar(require("./SourceCredibilityScorer"), exports);
__exportStar(require("./ExternalSourceManager"), exports);
__exportStar(require("./external-sources/WikipediaSource"), exports);
__exportStar(require("./external-sources/GovernmentDataSource"), exports);
//# sourceMappingURL=index.js.map