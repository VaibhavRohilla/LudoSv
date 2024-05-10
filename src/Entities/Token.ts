import { BoardPosition } from "./LudoBoard";


export enum TokenType {
    YELLOW,
    BLUE,
    RED,
    GREEN,
    NONE
}
export class Token {

    constructor(public tokenId: string, public tokenType: TokenType, startPos: BoardPosition, homePosNum: number) {

        this.startPos = startPos
        this.homePosNum = homePosNum;
        this.currPlace = this.startPos
    }
    public homePosNum!: number;

    public currPlace!: BoardPosition
    public startPos!: BoardPosition;

    public score: number = 0

}