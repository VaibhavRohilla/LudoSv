"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MSGTYPE = exports.ErrorCode = exports.GAMESTATE = exports.RemovePlayerEvent = exports.CreditReasons = exports.GAMEENDCONDITION = exports.getServerState = exports.getRandomGameId = exports.StartGameID = exports.TableTypeId = exports.ServerID = exports.TableID = exports.GamesappGameID = void 0;
const short_unique_id_1 = require("short-unique-id");
const server_1 = require("../server");
// import { Table, isReserved } from "../server";
const DataTypes_1 = require("./DataTypes");
exports.GamesappGameID = "11";
exports.TableID = 1001;
exports.ServerID = process.env.SERVERID ? process.env.SERVERID : "GS0";
exports.TableTypeId = parseInt(process.env.TABLETYPEID ? process.env.TABLETYPEID : "2");
exports.StartGameID = 1000;
const uid = new short_unique_id_1.default({
    length: 6,
});
function getRandomGameId() {
    return uid() + "-" + process.env.GAME_UNIQ_LOG_ID;
}
exports.getRandomGameId = getRandomGameId;
function getServerState() {
    if (server_1.Table) {
        if (server_1.Table.gameInStartProcess) {
            return DataTypes_1.ServerState.IN_GAME;
        }
        else {
            // if(isReserved) {
            //     return ServerState.RESERVED;
            // } else
            //
            if (server_1.Table.currentPlayersCount > 0) {
                return DataTypes_1.ServerState.MATCHMAKING;
            }
            else {
                return DataTypes_1.ServerState.ONLINE;
            }
        }
    }
    return null;
}
exports.getServerState = getServerState;
//moved tokens
//three six
//turn skipped
//no valid move
//all tokens in already
var GAMEENDCONDITION;
(function (GAMEENDCONDITION) {
    GAMEENDCONDITION["MOVTOKEN"] = "moveToken";
    GAMEENDCONDITION["THREESIX"] = "threeSix";
    GAMEENDCONDITION["TURNSKIPPED"] = "turnSkipped";
    GAMEENDCONDITION["NOVALIDMODE"] = "noValidMove";
    GAMEENDCONDITION["ALLTOKENSIN"] = "allTokensIn";
    GAMEENDCONDITION["ALLOPPONENTLEFT"] = "allOpponentLeft";
    GAMEENDCONDITION["ALLLEFTBEFORESTART"] = "allLeftBeforeStart";
})(GAMEENDCONDITION = exports.GAMEENDCONDITION || (exports.GAMEENDCONDITION = {}));
var CreditReasons;
(function (CreditReasons) {
    CreditReasons["WIN"] = "win";
    CreditReasons["LOSE"] = "lose";
    CreditReasons["DRAW"] = "draw";
})(CreditReasons = exports.CreditReasons || (exports.CreditReasons = {}));
var RemovePlayerEvent;
(function (RemovePlayerEvent) {
    RemovePlayerEvent[RemovePlayerEvent["DISCONNECTED"] = 0] = "DISCONNECTED";
    RemovePlayerEvent[RemovePlayerEvent["LEFT"] = 1] = "LEFT";
    RemovePlayerEvent[RemovePlayerEvent["KICKED"] = 2] = "KICKED";
    RemovePlayerEvent[RemovePlayerEvent["SWITCHED"] = 3] = "SWITCHED";
    RemovePlayerEvent[RemovePlayerEvent["ERRORED"] = 4] = "ERRORED";
    RemovePlayerEvent[RemovePlayerEvent["PRELEFT"] = 5] = "PRELEFT";
    RemovePlayerEvent[RemovePlayerEvent["TIMEOUT"] = 6] = "TIMEOUT";
    RemovePlayerEvent[RemovePlayerEvent["LEFT_DURING_START"] = 7] = "LEFT_DURING_START";
})(RemovePlayerEvent = exports.RemovePlayerEvent || (exports.RemovePlayerEvent = {}));
var GAMESTATE;
(function (GAMESTATE) {
    GAMESTATE[GAMESTATE["MATCHMAKING"] = 0] = "MATCHMAKING";
    GAMESTATE[GAMESTATE["STARTING"] = 1] = "STARTING";
    GAMESTATE[GAMESTATE["STARTED"] = 2] = "STARTED";
    GAMESTATE[GAMESTATE["IN_GAME"] = 3] = "IN_GAME";
    GAMESTATE[GAMESTATE["RESULT"] = 4] = "RESULT";
    GAMESTATE[GAMESTATE["ENDED"] = 5] = "ENDED";
    // RESTARTING
})(GAMESTATE = exports.GAMESTATE || (exports.GAMESTATE = {}));
var ErrorCode;
(function (ErrorCode) {
    ErrorCode["NULL"] = "Ez0000";
    ErrorCode["FULL_TABLE"] = "Ez0001";
    ErrorCode["NEXT_PLAYER_NULL"] = "Ez0002";
    ErrorCode["MONEY_CREDITED_FAIL"] = "Ez0003";
    ErrorCode["GAME_START_FAILED"] = "Ez0004";
    ErrorCode["RESTART_GAME_FAILED"] = "Ez0005";
})(ErrorCode = exports.ErrorCode || (exports.ErrorCode = {}));
var MSGTYPE;
(function (MSGTYPE) {
    MSGTYPE["JOINED"] = "joined";
    MSGTYPE["PADD"] = "pAdd";
    MSGTYPE["PLEFT"] = "pLeft";
    MSGTYPE["DICEROLLREQ"] = "RollDiceReq";
    MSGTYPE["DICEROLLRES"] = "RollDiceResult";
    MSGTYPE["MOVTOKEN"] = "moveToken";
    MSGTYPE["TIMER"] = "timer";
    MSGTYPE["TURNTIMER"] = "turnTimer";
    MSGTYPE["TURNSKIPPED"] = "turnSkipped";
    MSGTYPE["GAMESTART"] = "gameStart";
    MSGTYPE["THREESIX"] = "threeSix";
    MSGTYPE["GAMEENDED"] = "gameEnded";
    MSGTYPE["INVALIDMOVE"] = "invalidMove";
    MSGTYPE["WAITTIMER"] = "waitTimer";
    MSGTYPE["THREESKIPS"] = "threeSkips";
    MSGTYPE["ERROR"] = "error";
    MSGTYPE["NEXTTURN"] = "nextTurn";
    MSGTYPE["REJOINED"] = "rejoined";
    MSGTYPE["PL_REJOINED"] = "plRejoined";
    MSGTYPE["SWITCH_SUCCESS"] = "switchSuccess";
    MSGTYPE["SWITCH_FAILED"] = "switchFailed";
})(MSGTYPE = exports.MSGTYPE || (exports.MSGTYPE = {}));
//# sourceMappingURL=Utils.js.map