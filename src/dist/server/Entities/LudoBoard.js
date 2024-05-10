"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addTokenToPlace = exports.Board = exports.BoardPosition = void 0;
const Token_1 = require("./Token");
let BoardPositionAr = [];
class BoardPosition {
    constructor(postionNum) {
        this.postionNum = postionNum;
        this.CarpetType = Token_1.TokenType.NONE;
        this.isBlueCarpet = false;
        this.isRedCarpet = false;
        this.isGreenCarpet = false;
        this.currToken = [];
        this.isSafePoint = false;
        this.isHomePoint = false;
        this.nextPositionNum = [];
        BoardPositionAr.push(this);
    }
    init(isCarpetType, nextPositionNum, isHomePoint, isSafePoint) {
        this.CarpetType = isCarpetType;
        this.nextPositionNum = nextPositionNum;
        this.isHomePoint = isHomePoint;
        this.isSafePoint = isSafePoint;
    }
}
exports.BoardPosition = BoardPosition;
class Board {
    constructor() {
        this.LudoBoard = {};
        this.Tokens = {};
        console.log("creating board");
        for (let i = 76; i >= 1; i--) {
            this.LudoBoard[i] = new BoardPosition(i);
            if (i == 58 || i == 70 || i == 76 || i == 64)
                this.LudoBoard[i].init(Token_1.TokenType.NONE, [], true, false);
            else if (i >= 71 && i <= 75)
                this.LudoBoard[i].init(Token_1.TokenType.GREEN, [i + 1], false, false);
            else if (i >= 65 && i <= 69)
                this.LudoBoard[i].init(Token_1.TokenType.RED, [i + 1], false, false);
            else if (i >= 59 && i <= 63)
                this.LudoBoard[i].init(Token_1.TokenType.BLUE, [i + 1], false, false);
            else if (i >= 53 && i <= 57)
                this.LudoBoard[i].init(Token_1.TokenType.YELLOW, [i + 1], false, false);
            else if (i == 35 || i == 48 || i == 9 || i == 22 || i == 1 || i == 14 || i == 27 || i == 40)
                this.LudoBoard[i].init(Token_1.TokenType.NONE, [i + 1], false, true);
            else if (i == 52)
                this.LudoBoard[i].init(Token_1.TokenType.NONE, [1], false, false);
            else
                this.LudoBoard[i].init(Token_1.TokenType.NONE, [i + 1], false, false);
            if (i == 51)
                this.LudoBoard[i].nextPositionNum.push(53);
            if (i == 38)
                this.LudoBoard[i].nextPositionNum.push(71);
            if (i == 25)
                this.LudoBoard[i].nextPositionNum.push(65);
            if (i == 12)
                this.LudoBoard[i].nextPositionNum.push(59);
        }
        //  console.log(JSON.stringify(this.LudoBoard))
        this.Tokens["Y1"] = new Token_1.Token("Y1", Token_1.TokenType.YELLOW, this.LudoBoard[1], 58);
        this.Tokens["Y2"] = new Token_1.Token("Y2", Token_1.TokenType.YELLOW, this.LudoBoard[1], 58);
        this.Tokens["Y3"] = new Token_1.Token("Y3", Token_1.TokenType.YELLOW, this.LudoBoard[1], 58);
        this.Tokens["Y4"] = new Token_1.Token("Y4", Token_1.TokenType.YELLOW, this.LudoBoard[1], 58);
        this.Tokens["B1"] = new Token_1.Token("B1", Token_1.TokenType.BLUE, this.LudoBoard[14], 64);
        this.Tokens["B2"] = new Token_1.Token("B2", Token_1.TokenType.BLUE, this.LudoBoard[14], 64);
        this.Tokens["B3"] = new Token_1.Token("B3", Token_1.TokenType.BLUE, this.LudoBoard[14], 64);
        this.Tokens["B4"] = new Token_1.Token("B4", Token_1.TokenType.BLUE, this.LudoBoard[14], 64);
        this.Tokens["R1"] = new Token_1.Token("R1", Token_1.TokenType.RED, this.LudoBoard[27], 70);
        this.Tokens["R2"] = new Token_1.Token("R2", Token_1.TokenType.RED, this.LudoBoard[27], 70);
        this.Tokens["R3"] = new Token_1.Token("R3", Token_1.TokenType.RED, this.LudoBoard[27], 70);
        this.Tokens["R4"] = new Token_1.Token("R4", Token_1.TokenType.RED, this.LudoBoard[27], 70);
        this.Tokens["G1"] = new Token_1.Token("G1", Token_1.TokenType.GREEN, this.LudoBoard[40], 76);
        this.Tokens["G2"] = new Token_1.Token("G2", Token_1.TokenType.GREEN, this.LudoBoard[40], 76);
        this.Tokens["G3"] = new Token_1.Token("G3", Token_1.TokenType.GREEN, this.LudoBoard[40], 76);
        this.Tokens["G4"] = new Token_1.Token("G4", Token_1.TokenType.GREEN, this.LudoBoard[40], 76);
        //  console.log(JSON.stringify(this.Tokens))
    }
    getBoardSnap() {
        let snap = {};
        for (let i = 76; i >= 1; i--) {
            snap[i] = this.LudoBoard[i].currToken.map(token => token.tokenId);
        }
        return snap;
    }
}
exports.Board = Board;
function addTokenToPlace(token, positionNum, Board) {
    //removing token info from previous position
    let i = 0;
    let currTokenPosNum = token.currPlace.postionNum;
    for (i = 0; i < Board.LudoBoard[currTokenPosNum].currToken.length; i++) {
        if (Board.LudoBoard[currTokenPosNum].currToken[i].tokenId == token.tokenId)
            break;
    }
    Board.LudoBoard[currTokenPosNum].currToken.splice(i, 1);
    //adding token info to new position
    Board.LudoBoard[positionNum].currToken.push(token);
    //setting token current place
    token.currPlace = Board.LudoBoard[positionNum];
}
exports.addTokenToPlace = addTokenToPlace;
//# sourceMappingURL=LudoBoard.js.map