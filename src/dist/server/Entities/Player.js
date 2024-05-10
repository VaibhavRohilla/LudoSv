"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = exports.PLAYERSTATE = void 0;
const apicalls_1 = require("../apicalls");
const Money_1 = require("./Money");
const LoggingHandler_1 = require("../LoggingHandler");
const Utils_1 = require("./Utils");
var PLAYERSTATE;
(function (PLAYERSTATE) {
    PLAYERSTATE[PLAYERSTATE["WAITING"] = 0] = "WAITING";
    PLAYERSTATE[PLAYERSTATE["ROLLDICE"] = 1] = "ROLLDICE";
    PLAYERSTATE[PLAYERSTATE["SELECTTOKEN"] = 2] = "SELECTTOKEN";
    PLAYERSTATE[PLAYERSTATE["ROLLED"] = 3] = "ROLLED";
})(PLAYERSTATE = exports.PLAYERSTATE || (exports.PLAYERSTATE = {}));
class Player {
    constructor(plSocket, tableGameID, playerID, plName, profileImage) {
        this.plSocket = plSocket;
        this.tableGameID = tableGameID;
        this.playerID = playerID;
        this.plName = plName;
        this.profileImage = profileImage;
        this.hasDeposited = false;
        this.plRoomNetId = -1;
        this.gRoom = null;
        this.score = 0;
        this.winAmount = new Money_1.Money(0);
        this.resultReason = "";
        this.balance = new Money_1.Money(0);
        this.removalEvent = null;
        this.sixRollStreak = 0;
        this._state = PLAYERSTATE.WAITING;
        this.lastMovableTokens = [];
        //public playerTokens: Token[] = [];
        this.skippedTurns = 0;
        this.isDisconnected = false;
        this.treatAsDisconnectTimeout = null;
    }
    assignTokens() {
    }
    get state() {
        return this._state;
    }
    set state(value) {
        if (this.gRoom)
            (0, LoggingHandler_1.LogMessage)(`Player ${this.playerID} state changed ${PLAYERSTATE[value]}`, this.gRoom, this);
        this._state = value;
    }
    updateRemovalEvent(event) {
        if (this.removalEvent == Utils_1.RemovePlayerEvent.TIMEOUT)
            return false;
        this.removalEvent = event;
        return true;
    }
    //id of game session player is inside
    sendMessage(content, isBinary = false) {
        if (content.t == "timer" || content.t == "turnTimer") {
        }
        else {
            //  console.log("Sending to "+ this.plName +"----");
            //  console.log(content);
        }
        if (this.plSocket && this.plSocket.isConnectionAlive) {
            if (isBinary)
                this.plSocket.send(content);
            else {
                try {
                    this.plSocket.send(JSON.stringify(content));
                }
                catch (_a) {
                    // console.log("Error in sending message to player");
                    console.log(content);
                    (0, apicalls_1.sendToAnalytics)({
                        collection: apicalls_1.DBCollectionNames.UnexpectedErrors,
                        data: {
                            type: "SOCKET_NULL",
                            msg: "Error in sending message to player",
                            playerId: this.playerID,
                            tableGameId: this.tableGameID,
                            content: content,
                        }
                    });
                    // throw new Error("Error in sending message to player");
                }
            }
        }
        // if (this.plSocket) {
        //     if (isBinary)
        //         this.plSocket.send(content);
        //     else {
        //         this.plSocket.send(JSON.stringify(content));
        //     }
        // }
    }
    recievePing() {
        if (this.treatAsDisconnectTimeout)
            clearTimeout(this.treatAsDisconnectTimeout);
        this.treatAsDisconnectTimeout = setTimeout(() => {
            if (this.gRoom)
                (0, LoggingHandler_1.LogMessage)(`Marking Player ${this.playerID} is disconnected`, this.gRoom, this);
            else
                console.log(`Marking Player ${this.playerID} is disconnected`);
        }, 4000);
        this.sendMessage({ t: "pong" });
    }
    reset() {
        this.state = PLAYERSTATE.WAITING;
        this.skippedTurns = 0;
        this.score = 0;
        this.winAmount = new Money_1.Money(0);
        this.balance = new Money_1.Money(0);
    }
}
exports.Player = Player;
//# sourceMappingURL=Player.js.map