export interface JWTPayload {
    userId: string;
    role: string;
    iat?: number;
    exp?: number;
}
export declare function generateJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>): string;
export declare function verifyJWT(token: string): JWTPayload;
export declare function decodeJWT(token: string): JWTPayload | null;
//# sourceMappingURL=jwt.d.ts.map