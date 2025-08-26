"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateJWT = generateJWT;
exports.verifyJWT = verifyJWT;
exports.decodeJWT = decodeJWT;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function generateJWT(payload) {
    const secret = process.env.JWT_SECRET || 'test-secret';
    return jsonwebtoken_1.default.sign(payload, secret, { expiresIn: '1h' });
}
function verifyJWT(token) {
    const secret = process.env.JWT_SECRET || 'test-secret';
    return jsonwebtoken_1.default.verify(token, secret);
}
function decodeJWT(token) {
    try {
        return jsonwebtoken_1.default.decode(token);
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=jwt.js.map