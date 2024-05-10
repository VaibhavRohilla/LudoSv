"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Token = exports.TokenType = void 0;
var TokenType;
(function (TokenType) {
    TokenType[TokenType["YELLOW"] = 0] = "YELLOW";
    TokenType[TokenType["BLUE"] = 1] = "BLUE";
    TokenType[TokenType["RED"] = 2] = "RED";
    TokenType[TokenType["GREEN"] = 3] = "GREEN";
    TokenType[TokenType["NONE"] = 4] = "NONE";
})(TokenType = exports.TokenType || (exports.TokenType = {}));
class Token {
    constructor(tokenId, tokenType, startPos, homePosNum) {
        this.tokenId = tokenId;
        this.tokenType = tokenType;
        this.score = 0;
        this.startPos = startPos;
        this.homePosNum = homePosNum;
        this.currPlace = this.startPos;
    }
}
exports.Token = Token;
//# sourceMappingURL=Token.js.map