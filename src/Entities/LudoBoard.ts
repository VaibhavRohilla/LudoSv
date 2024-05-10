import { tokenToString } from "typescript";
import { Token, TokenType } from "./Token";



let BoardPositionAr: any = [];

export class BoardPosition {

    constructor(public postionNum: number) {

        BoardPositionAr.push(this);
    }

    public init(isCarpetType: TokenType, nextPositionNum: number[], isHomePoint: boolean, isSafePoint: boolean) {

        this.CarpetType = isCarpetType

        this.nextPositionNum = nextPositionNum;
        this.isHomePoint = isHomePoint;
        this.isSafePoint = isSafePoint;
    }
    public CarpetType: TokenType = TokenType.NONE;
    public isBlueCarpet: boolean = false;
    public isRedCarpet: boolean = false;
    public isGreenCarpet: boolean = false;

    public currToken: Token[] = [];
    public isSafePoint: boolean = false;
    public isHomePoint: boolean = false;
    public nextPositionNum: number[] = []
    // public isJailPoint: boolean = false;



}


export class Board {
    public LudoBoard: { [id: number]: BoardPosition } = {}
    public Tokens: { [id: string]: Token } = {}


    constructor() {
        console.log("creating board")
        for (let i = 76; i >= 1; i--) {

            this.LudoBoard[i] = new BoardPosition(i);

            if (i == 58 || i == 70 || i == 76 || i == 64)
                this.LudoBoard[i].init(TokenType.NONE, [], true, false)

            else if (i >= 71 && i <= 75)
                this.LudoBoard[i].init(TokenType.GREEN, [i + 1], false, false)

            else if (i >= 65 && i <= 69)
                this.LudoBoard[i].init(TokenType.RED, [i + 1], false, false)

            else if (i >= 59 && i <= 63)
                this.LudoBoard[i].init(TokenType.BLUE, [i + 1], false, false)

            else if (i >= 53 && i <= 57)
                this.LudoBoard[i].init(TokenType.YELLOW, [i + 1], false, false)

            else if (i == 35 || i == 48 || i == 9 || i == 22 || i == 1 || i == 14 || i == 27 || i == 40)
                this.LudoBoard[i].init(TokenType.NONE, [i + 1], false, true)

            else if (i == 52)
                this.LudoBoard[i].init(TokenType.NONE, [1], false, false)
            else
                this.LudoBoard[i].init(TokenType.NONE, [i + 1], false, false)

            if (i == 51)
                this.LudoBoard[i].nextPositionNum.push(53)

            if (i == 38)
                this.LudoBoard[i].nextPositionNum.push(71)

            if (i == 25)
                this.LudoBoard[i].nextPositionNum.push(65)

            if (i == 12)
                this.LudoBoard[i].nextPositionNum.push(59)

        }

      //  console.log(JSON.stringify(this.LudoBoard))

        this.Tokens["Y1"] = new Token("Y1", TokenType.YELLOW, this.LudoBoard[1], 58);
        this.Tokens["Y2"] = new Token("Y2", TokenType.YELLOW, this.LudoBoard[1], 58);
        this.Tokens["Y3"] = new Token("Y3", TokenType.YELLOW, this.LudoBoard[1], 58);
        this.Tokens["Y4"] = new Token("Y4", TokenType.YELLOW, this.LudoBoard[1], 58);
        this.Tokens["B1"] = new Token("B1", TokenType.BLUE, this.LudoBoard[14], 64);
        this.Tokens["B2"] = new Token("B2", TokenType.BLUE, this.LudoBoard[14], 64);
        this.Tokens["B3"] = new Token("B3", TokenType.BLUE, this.LudoBoard[14], 64);
        this.Tokens["B4"] = new Token("B4", TokenType.BLUE, this.LudoBoard[14], 64);
        this.Tokens["R1"] = new Token("R1", TokenType.RED, this.LudoBoard[27], 70);
        this.Tokens["R2"] = new Token("R2", TokenType.RED, this.LudoBoard[27], 70);
        this.Tokens["R3"] = new Token("R3", TokenType.RED, this.LudoBoard[27], 70);
        this.Tokens["R4"] = new Token("R4", TokenType.RED, this.LudoBoard[27], 70);
        this.Tokens["G1"] = new Token("G1", TokenType.GREEN, this.LudoBoard[40], 76);
        this.Tokens["G2"] = new Token("G2", TokenType.GREEN, this.LudoBoard[40], 76);
        this.Tokens["G3"] = new Token("G3", TokenType.GREEN, this.LudoBoard[40], 76);
        this.Tokens["G4"] = new Token("G4", TokenType.GREEN, this.LudoBoard[40], 76);

      //  console.log(JSON.stringify(this.Tokens))

    }

    getBoardSnap()
    {
        let snap : {[pos : number] : string[]}= {}

        for (let i = 76; i >= 1; i--) {
            snap[i] = this.LudoBoard[i].currToken.map(token => token.tokenId)
        }

        return snap
    }
}



export function addTokenToPlace(token: Token, positionNum: number, Board: Board) {


    //removing token info from previous position
    let i = 0;
    let currTokenPosNum = token.currPlace.postionNum;
    for (i = 0; i < Board.LudoBoard[currTokenPosNum].currToken.length; i++) {
        if (Board.LudoBoard[currTokenPosNum].currToken[i].tokenId == token.tokenId)
            break;
    }
    Board.LudoBoard[currTokenPosNum].currToken.splice(i, 1)


    //adding token info to new position
    Board.LudoBoard[positionNum].currToken.push(token);

    //setting token current place
    token.currPlace = Board.LudoBoard[positionNum]

}


