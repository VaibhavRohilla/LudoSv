import ShortUniqueId from "short-unique-id";
import { Table } from "../server";
// import { Table, isReserved } from "../server";
import { ServerState } from "./DataTypes";


export const GamesappGameID = "11"
export const TableID = 1001;

export const ServerID = process.env.SERVERID ? process.env.SERVERID : "GS0";
export const TableTypeId = parseInt(process.env.TABLETYPEID ? process.env.TABLETYPEID : "2");
export const StartGameID = 1000;

const uid = new ShortUniqueId({
    length: 6,
});

export function getRandomGameId() {
    return uid() + "-" + process.env.GAME_UNIQ_LOG_ID;
}

export function getServerState() {

    if (Table) {

        if (Table.gameInStartProcess) {
            return ServerState.IN_GAME;
        } else {
            // if(isReserved) {
            //     return ServerState.RESERVED;
            // } else
            //
            if (Table.currentPlayersCount > 0) {
                return ServerState.MATCHMAKING;
            } else {
                return ServerState.ONLINE;
            }
        }
    }
    return null;
}

export interface GameEndReport {
    tableId: string,
    gameRoundId: string,
    startTime: Date,
    endTime: string | Date | undefined,
    players: string[],
    waitingPlayers: string[],
    gameData: any,
    result: Result,
    isEndedCleanly: boolean,
    reason: string | undefined,
    entryFees: {
        [index: string]: number
    },
    leftPlayers: {
        [index: string]: string //reason
    }
}

export interface Result {
    [index: string]: { amount: number, score: number }
}




//moved tokens
//three six
//turn skipped
//no valid move
//all tokens in already



export enum GAMEENDCONDITION {

    MOVTOKEN = "moveToken",
    THREESIX = "threeSix",
    TURNSKIPPED = "turnSkipped",
    NOVALIDMODE = "noValidMove",
    ALLTOKENSIN = "allTokensIn",
    ALLOPPONENTLEFT = "allOpponentLeft",
    ALLLEFTBEFORESTART = "allLeftBeforeStart",

}

export enum CreditReasons {
    WIN = "win",
    LOSE = "lose",
    DRAW = "draw",
}



export enum RemovePlayerEvent {
    DISCONNECTED,
    LEFT,
    KICKED,
    SWITCHED,
    ERRORED,
    PRELEFT,
    TIMEOUT,
    LEFT_DURING_START
}


export enum GAMESTATE {
    MATCHMAKING,
    STARTING,
    STARTED,
    IN_GAME,
    RESULT,
    ENDED,
    // RESTARTING
}





export enum ErrorCode {
    NULL = "Ez0000",
    FULL_TABLE = "Ez0001",
    NEXT_PLAYER_NULL = "Ez0002",
    MONEY_CREDITED_FAIL = "Ez0003",
    GAME_START_FAILED = "Ez0004",
    RESTART_GAME_FAILED = "Ez0005",
}






export enum MSGTYPE {
    JOINED = "joined",
    PADD = "pAdd",
    PLEFT = "pLeft",
    DICEROLLREQ = "RollDiceReq",
    DICEROLLRES = "RollDiceResult",
    MOVTOKEN = "moveToken",
    TIMER = "timer",
    TURNTIMER = "turnTimer",
    TURNSKIPPED = "turnSkipped",
    GAMESTART = "gameStart",
    THREESIX = "threeSix",
    GAMEENDED = "gameEnded",
    INVALIDMOVE = "invalidMove",
    WAITTIMER = "waitTimer",
    THREESKIPS = "threeSkips",
    ERROR = "error",
    NEXTTURN = "nextTurn",
    REJOINED = "rejoined",
    PL_REJOINED = "plRejoined",
    SWITCH_SUCCESS = "switchSuccess",
    SWITCH_FAILED = "switchFailed",
}





