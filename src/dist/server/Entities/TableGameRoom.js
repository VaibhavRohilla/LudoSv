"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableGameRoom = void 0;
const timers_1 = require("timers");
const LoggingHandler_1 = require("../LoggingHandler");
const server_1 = require("../server");
const logUtils_1 = require("./logUtils");
const LudoBoard_1 = require("./LudoBoard");
const Player_1 = require("./Player");
const Token_1 = require("./Token");
const Utils_1 = require("./Utils");
const Money_1 = require("./Money");
const apicalls_1 = require("../apicalls");
const DataTypes_1 = require("./DataTypes");
class TableGameRoom {
    constructor(tableTypeId) {
        this.turnTimeVal = 8;
        this.turnTimer = this.turnTimeVal;
        this.waitTimerVal = 10;
        this.waitTimer = this.waitTimerVal;
        this.gameTimerVal = 8 * 60;
        this.minPlayers = 2;
        this.maxPlayers = 4;
        this.PlayersUniqIdDict = {};
        this.board = new LudoBoard_1.Board();
        this.gameShouldEndNow = false;
        this.currentGameRoundId = '';
        this.stopRestart = false;
        this.currentGameState = Utils_1.GAMESTATE.MATCHMAKING;
        this.gameInStartProcess = false;
        this.entryFee = 0;
        this.potRatioArr = [];
        this.rake = new Money_1.Money(0);
        this.playersLeftDuringGameStart = [];
        this.leftPlayersForClientSending = [];
        this.hasReportSent = false;
        this.currentPlayersCount = 0;
        this.isGameEnded = false;
        this.resultCalculationStarted = false;
        this.HandleLeftProcessQueue = [];
        this.isInHandlingLeftQueueProcess = false;
        this.gamePlayTimer = this.gameTimerVal;
        this.gameStarted = false;
        this.currDiceRollVal = null;
        this.potDistribution = [];
        this.currentGameRoundId = (0, Utils_1.getRandomGameId)();
        this.setTableTypeProperties(tableTypeId);
        (0, LoggingHandler_1.TableLogInit)(this);
        (0, LoggingHandler_1.LogMessage)("Table Initialized", this);
        this.setIntervalForProcessHandleLeftQueue();
    }
    setTableTypeProperties(tableType) {
        this.tableTypeID = tableType.toString();
        this.entryFee = parseFloat(server_1.TableTypesDict[tableType].minEntryFee);
        this.potRatioArr = server_1.TableTypesDict[tableType].data.winningAmount;
        (0, LoggingHandler_1.LogMessage)(`Table Type Properties set ${this.tableTypeID} | ${this.entryFee}`, this);
    }
    addPlayerToRoom(pl, playerBal) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Wait TIMER :" + this.waitTimerVal);
            //check if disconnected player is trying to join again
            const disconnectedPlId = this.checkIfPlayerDisconnected(pl.playerID);
            console.log("player attempting to join " + pl.playerID);
            if (disconnectedPlId == -1) //if player is not disconnected one
             {
                console.log("player not disconnected " + pl.playerID);
                //check if player is already in room
                for (let i = 0; i < this.maxPlayers; i++) {
                    if (this.PlayersUniqIdDict[i] && this.PlayersUniqIdDict[i].playerID == pl.playerID) {
                        (0, LoggingHandler_1.LogMessage)(`Player ${pl.playerID} is already in room`, this);
                        (0, LoggingHandler_1.LogMessage)("Closing socket because player is already in room", this);
                        console.log("Closing socket because player is already in room " + pl.playerID);
                        if (pl && pl.plSocket && pl.plSocket.isConnectionAlive) {
                            pl.sendMessage({
                                t: Utils_1.MSGTYPE.ERROR,
                                data: `You are already in room`,
                                showMessage: true
                            });
                            try {
                                (_a = pl.plSocket) === null || _a === void 0 ? void 0 : _a.end();
                            }
                            catch (_e) {
                                console.log("error in closing socket");
                            }
                        }
                        return;
                    }
                }
                let servAddr = process.env.SERVERADDRESS ? process.env.SERVERADDRESS : "localhost:8080";
                (0, apicalls_1.CallUpdatePlayerStatus)(parseInt(pl.playerID), DataTypes_1.GlobalPlayerState.IN_LUDO, servAddr, (0, server_1.getEntryFee)(), Utils_1.TableTypeId).then((r) => {
                    if (r) {
                        console.log("Player Status Updated");
                    }
                    else {
                        console.log("Player Status Update Failed");
                    }
                });
                console.log("checking if maximum players are there or game in start process " + pl.playerID + " count:" + this.currentPlayersCount + "gameInStart:" + this.gameInStartProcess);
                if (this.currentPlayersCount >= this.maxPlayers || this.gameInStartProcess) {
                    (0, LoggingHandler_1.LogMessage)(`Kicking ${pl.playerID}, Reason : full or game started table`, this);
                    console.log("Kicking, Reason : full or game started table " + pl.playerID);
                    (0, logUtils_1.LogErrorToDB)({
                        functionName: "addPlayerToRoom",
                        reason: "Unable to join full or game started table",
                        properties: { playerID: pl.playerID, cTID: Utils_1.TableID },
                        time: new Date(),
                        servId: process.env.SERVERID,
                        errorCode: Utils_1.ErrorCode.FULL_TABLE
                    });
                    (0, apicalls_1.CallUpdatePlayerStatus)(parseInt(pl.playerID), DataTypes_1.GlobalPlayerState.IN_APP, "", -1, -1);
                    console.log("sending pl the unable to join msg " + pl.playerID);
                    if (pl && pl.plSocket && pl.plSocket.isConnectionAlive) {
                        pl.sendMessage({ t: Utils_1.MSGTYPE.ERROR, data: `Unable to join table, Error Code : ${Utils_1.ErrorCode.FULL_TABLE}`, code: Utils_1.ErrorCode.FULL_TABLE });
                        (_b = pl.plSocket) === null || _b === void 0 ? void 0 : _b.end();
                    }
                    try {
                        (_c = pl.plSocket) === null || _c === void 0 ? void 0 : _c.end();
                    }
                    catch (e) {
                        //log in error stream
                        console.log(e);
                        console.log("Error while closing socket");
                    }
                    console.log("This table is already full cant join : " + Utils_1.ErrorCode.FULL_TABLE);
                    return;
                }
                this.currentPlayersCount++;
                console.log(" Before Locking Current Players Count : " + this.currentPlayersCount);
                //lock player funds and then let him join
                const lockFunds = yield (0, apicalls_1.CallLockFundsAPI)(pl.playerID, playerBal, server_1.Table.currentGameRoundId, true, pl.hasDeposited, undefined);
                if (!lockFunds.success) {
                    console.log("Lock Funds Failed");
                    (0, LoggingHandler_1.LogMessage)("Lock Funds Failed", server_1.Table, pl);
                    this.currentPlayersCount--;
                    (0, apicalls_1.CallUpdatePlayerStatus)(parseInt(pl.playerID), DataTypes_1.GlobalPlayerState.IN_APP, "", -1, -1);
                    console.log("Closing socket because lock funds failed");
                    if (pl && pl.plSocket && pl.plSocket.isConnectionAlive) {
                        pl.sendMessage({
                            t: Utils_1.MSGTYPE.ERROR,
                            data: `Unable to join table,\n ${lockFunds.data}`,
                        });
                        try {
                            (_d = pl.plSocket) === null || _d === void 0 ? void 0 : _d.end();
                        }
                        catch (e) {
                            console.log("Error while ending socket in line 217");
                        }
                    }
                    return;
                }
            }
            //this is case for disconnected players try to rejoin
            if (disconnectedPlId != -1) {
                const player = this.PlayersUniqIdDict[disconnectedPlId];
                player.isDisconnected = false;
                pl.plSocket.player = player;
                player.plSocket = pl.plSocket;
                (0, LoggingHandler_1.LogMessage)(`Player ${pl.playerID} reconnected`, this);
                this.handleRejoinPlayer(player, playerBal);
                return;
            }
            for (let i = 0; i < this.maxPlayers; i++) {
                if (this.PlayersUniqIdDict[i] != null) {
                    if (this.PlayersUniqIdDict[i].playerID == pl.playerID) {
                        console.log("This player is already joined");
                        (0, LoggingHandler_1.LogMessage)(`Player with ${pl.playerID} is already joined!`, this);
                        this.currentPlayersCount--;
                        return;
                    }
                }
            }
            if ((!pl) || (!pl.plSocket) || (!pl.plSocket.isConnectionAlive)) {
                if (!pl)
                    (0, LoggingHandler_1.LogMessage)(`Kicking Player, Reason : player is null`, this);
                else if (!pl.plSocket)
                    (0, LoggingHandler_1.LogMessage)(`Kicking ${pl.playerID}, Reason : player socket is null`, this);
                else if (!pl.plSocket.isConnectionAlive)
                    (0, LoggingHandler_1.LogMessage)(`Kicking ${pl.playerID}, Reason : socket not alive`, this);
                // CallLeftPlayerAPI(this.tableGameId, pl.playerID, RemovePlayerEvent.ERRORED);
                //Calling UnLockFundsAPI to unlock the funds of player as It is locked while createNewPlayerFunction in server.ts
                yield (0, apicalls_1.CallLockFundsAPI)(pl.playerID, this.entryFee, this.currentGameRoundId, false, pl.hasDeposited, "Errored while joining table");
                (0, apicalls_1.CallUpdatePlayerStatus)(parseInt(pl.playerID), DataTypes_1.GlobalPlayerState.IN_APP, "", -1, -1);
                this.currentPlayersCount--;
                // if (this.currentPlayersCount <= 0) {
                //     this.deleteTableTimeout = setTimeout(() => {
                //         console.log("closing the table")
                //         // this.closeTableImmediate(`Player socket not alive and playerCount is ${this.currentPlayersCount}`, false, false);
                //         this.cleanUpTable(`Player socket not alive and playerCount is ${this.currentPlayersCount}`, false, false);
                //     }, 5000);
                // }
                return;
            }
            this.handleJoinPlayer(pl, playerBal);
            //this.currentPlayersCount++;
            (0, timers_1.clearTimeout)(this.deleteTableTimeout);
            this.waitTimer = this.waitTimerVal;
            //if current players equal minimum players then start 15 second countdown to start the game.
            console.log("Current Players Count : " + this.currentPlayersCount);
            if (this.currentPlayersCount >= 1) {
                console.log("################# Restarting Wait Timer  Curr Pls:" + this.currentPlayersCount + "###################");
                if (!this.gameInStartProcess) {
                    //above check added as the timer was getting started twice in case of player's lock funds success coming at the moment 3,2,1 was started already
                    (0, timers_1.clearTimeout)(this.waitTimeout);
                    //TLDR this should not get started twice in case of player leaves and joins
                    this.waitTimeout = setTimeout(this.waitTimerLoop.bind(this), 1000);
                }
            }
            console.log("Adding Pl to room =======");
            (0, LoggingHandler_1.LogMessage)(`Adding player ${pl.playerID} to room`, this);
        });
    }
    checkIfPlayerDisconnected(playerID) {
        let plIndex = -1;
        for (let i = 0; i < this.maxPlayers; i++) {
            if (this.PlayersUniqIdDict[i] != null) {
                if (this.PlayersUniqIdDict[i].playerID == playerID) {
                    plIndex = i;
                    break;
                }
            }
        }
        if (plIndex != -1) {
            if (!this.PlayersUniqIdDict[plIndex].isDisconnected) {
                return -1;
            }
        }
        return plIndex;
    }
    handleRejoinPlayer(player, playerBal) {
        player.gRoom = this;
        player.balance = new Money_1.Money(playerBal);
        let leftPlAr = [];
        for (let i = 0; i < this.leftPlayersForClientSending.length; i++) {
            leftPlAr.push({
                "plId": this.leftPlayersForClientSending[i].plRoomNetId,
                "pname": this.leftPlayersForClientSending[i].plName,
                "pImg": this.leftPlayersForClientSending[i].profileImage
            });
        }
        const rejoinMsg = {
            t: Utils_1.MSGTYPE.REJOINED,
            plId: player.plRoomNetId,
            tId: this.currentGameRoundId,
            bal: player.balance.value,
            snap: this.getRoomSnap(),
            pot: this.potDistribution,
            board: this.board.getBoardSnap(),
            gameRoundId: this.currentGameRoundId,
            turn: this.currPlAtTurn.plRoomNetId,
            stats: this.getStats(),
            leftPls: leftPlAr,
            //added state so that player can know if he is in select token state or not
            state: player.state,
            //added dice roll value so that player can know number on dice if he is in select token state
            rollDice: player.state == Player_1.PLAYERSTATE.SELECTTOKEN ? this.currDiceRollVal : undefined,
            movableTokens: player.state == Player_1.PLAYERSTATE.SELECTTOKEN ? player.lastMovableTokens : undefined,
        };
        const playerRejoinMsg = {
            t: Utils_1.MSGTYPE.PL_REJOINED,
            plId: player.plRoomNetId,
            image: player.profileImage,
            name: player.plName,
            bal: player.balance.value,
        };
        player.sendMessage(rejoinMsg);
        this.sendMessageToOthers(playerRejoinMsg, player.plRoomNetId);
    }
    handleJoinPlayer(pl, playerBal) {
        //Assign Seat
        if (this.currentPlayersCount == 2 && this.PlayersUniqIdDict[2] == null) {
            let nextPosition = 0;
            let currPlOccPos = 0;
            for (let i = 0; i < this.maxPlayers; i++) {
                if (this.PlayersUniqIdDict[i]) {
                    currPlOccPos = i;
                    nextPosition = i + 2 > 3 ? i + 2 - 4 : i + 2;
                    break;
                }
            }
            this.PlayersUniqIdDict[nextPosition] = pl;
            pl.plRoomNetId = nextPosition;
        }
        else {
            for (let i = 0; i < this.maxPlayers; i++)
                if (this.PlayersUniqIdDict[i] == null) {
                    this.PlayersUniqIdDict[i] = pl;
                    pl.plRoomNetId = i;
                    //  pl.assignTokens();
                    break;
                }
        }
        pl.gRoom = this;
        pl.balance = new Money_1.Money(playerBal);
        let playerAddedMsg = {
            t: Utils_1.MSGTYPE.PADD,
            plId: pl.plRoomNetId,
            pImage: pl.profileImage,
            pName: pl.plName,
            bal: pl.balance.value
        };
        let leftPlAr = [];
        for (let i = 0; i < this.leftPlayersForClientSending.length; i++) {
            leftPlAr.push({
                "plId": this.leftPlayersForClientSending[i].plRoomNetId,
                "pname": this.leftPlayersForClientSending[i].plName,
                "pImg": this.leftPlayersForClientSending[i].profileImage
            });
        }
        //send message to player for succesful room joins
        //send his place on the map and initial game state.
        pl.sendMessage({
            t: Utils_1.MSGTYPE.JOINED,
            plId: pl.plRoomNetId,
            tID: this.currentGameRoundId,
            bal: pl.balance.value,
            snap: this.getRoomSnap(),
            leftPls: leftPlAr,
        });
        //send to others that player has joined
        this.sendMessageToOthers(playerAddedMsg, pl.plRoomNetId);
    }
    roundToTwoDigits(amount) {
        return Math.trunc((amount * 100)) / 100;
    }
    startTheGame() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("############  Starting the game   #############");
            // let result = await callTableGameStartingAPI(this.gameId, this.tableGameId)
            // if (result) {
            // this.closeTable("Starting Table Game Failed", "Table Game Starting API Failed", true);
            // return;
            // } else
            // {
            //   this.gameInStartProcess = true;
            (0, LoggingHandler_1.LogMessage)(`Starting Game....`, this);
            this.currentGameState = Utils_1.GAMESTATE.STARTED;
            const playerIds = [];
            for (let i = 0; i < this.maxPlayers; i++) {
                if (this.PlayersUniqIdDict[i]) {
                    playerIds.push(this.PlayersUniqIdDict[i].playerID);
                    // if(this.PlayersUniqIdDict[i].playerID === "263079") {
                    //     this.gameTimerVal = 30;
                    // }
                }
            }
            // const startResult = await sendGameStartedAlert(this.tableGameId, playerIds);
            // const startResult = {
            //
            // }
            // if(!) // Line to update
            // {
            //     this.closeTable("Starting Table Game Failed", "Enable to mark game started on loadbalancer", true, ErrorCode.GAME_START_FAILED);
            //     return;
            // }
            // this.isGameStartedOnLB = true;
            // this.setTableTypeProperties(startResult.tableTypeId); // it is not setting inside create new player
            // this.currentGameRoundId = startResult.gameRoundId;
            // this.currentGameRoundId = gameRoundId;
            // LogInit(this);
            (0, LoggingHandler_1.LogMessage)(`New Session Id Generated : ${this.currentGameRoundId}`, this);
            this.currentGameReport = {
                tableId: Utils_1.TableID + "",
                gameRoundId: this.currentGameRoundId,
                startTime: new Date(),
                endTime: undefined,
                players: [],
                waitingPlayers: [],
                gameData: {},
                result: {},
                isEndedCleanly: true,
                reason: undefined,
                entryFees: {},
                leftPlayers: {}
            };
            (0, LoggingHandler_1.LogMessage)(JSON.stringify(this.currentGameReport), this);
            (0, logUtils_1.LogGameStateToDB)(logUtils_1.LogGameStates.GAME_STARTED, this); //Log To DB
            // }
            console.log("################# Deductions Started ###################");
            // TLDR Player should not be able to run back 
            let potAmt = new Money_1.Money(0);
            for (let i = 0; i < this.maxPlayers; i++) {
                if (this.PlayersUniqIdDict[i]) {
                    // let waitCallUpdate = await callUpdateCoinWalletAPI(this.PlayersUniqIdDict[i].playerID, GamesappGameID, this.tableGameId, (-1 * entryFee).toString(), "PLAYER_BET", true, "Ludo test BET", this.currentGameSession);
                    const player = this.PlayersUniqIdDict[i];
                    (0, LoggingHandler_1.LogMessage)("Deducting Balance " + this.entryFee.toString(), this, player);
                    console.log("################# Deducting Balance #########" + player.playerID + "##########");
                    let deductApiResponse = yield (0, apicalls_1.CallDebitWalletAPI)(player.playerID, this.entryFee, this.currentGameRoundId);
                    if (!deductApiResponse.status) {
                        (0, LoggingHandler_1.LogMessage)("Deducting balance failed..." + deductApiResponse.message, this, player);
                        console.log("################# Deducting balance FAILED #########" + player.playerID + "##########");
                        player.sendMessage({
                            t: Utils_1.MSGTYPE.ERROR,
                            msg: "Deducting balance failed! Kicking Player..." + deductApiResponse.message
                        });
                        this.removePlayerFromRoom(player, true, Utils_1.RemovePlayerEvent.ERRORED);
                        continue;
                    }
                    this.currentGameReport.entryFees[player.playerID] = this.entryFee;
                    console.log("################# Deducting Success #########" + player.playerID + "##########");
                    (0, LoggingHandler_1.LogMessage)(`Deduction Success : ${JSON.stringify(deductApiResponse)}`, this, player);
                    player.hasDeposited = true;
                    potAmt.add(new Money_1.Money(this.entryFee));
                    this.currentGameReport.players.push(player.playerID);
                    (0, LoggingHandler_1.LogMessage)("Added to report list", this, player);
                }
            }
            //Moved pot distribution code up to handle case of all players left before start. Otherwise pot distribution was not getting calculated
            this.potDistribution = [
                // this.roundToTwoDigits(potAmt * this.potRatioArr[0] / 100),
                Money_1.Money.Multiply(potAmt, (this.potRatioArr[0] / 100)).value,
                Money_1.Money.Multiply(potAmt, (this.potRatioArr[1] / 100)).value,
                Money_1.Money.Multiply(potAmt, (this.potRatioArr[2] / 100)).value,
                Money_1.Money.Multiply(potAmt, (this.potRatioArr[3] / 100)).value
            ];
            this.potDistribution[3] = potAmt.value - this.potDistribution[0] - this.potDistribution[1] - this.potDistribution[2];
            (0, LoggingHandler_1.LogMessage)("Pot Distribution : " + this.potDistribution, this);
            console.log(this.potDistribution);
            //playersLeftDuringGameStart in this list the lowest player has left at the end
            if (this.playersLeftDuringGameStart.length == this.currentPlayersCount) {
                //show player Ids of players who left
                let plIdsLeftsLog = "";
                for (let i = 0; i < this.playersLeftDuringGameStart.length; i++) {
                    plIdsLeftsLog += this.playersLeftDuringGameStart[i].playerID + ",";
                }
                console.log("################# Players Left Before Start: " + plIdsLeftsLog + " ###################");
                let playersWhoDeposited = [];
                //everyone left
                // we need to filter the players who have actually deposited the money
                for (let i = 0; i < this.playersLeftDuringGameStart.length; i++) {
                    let playerId = this.playersLeftDuringGameStart[i].playerID;
                    if (this.currentGameReport.entryFees[playerId]) {
                        playersWhoDeposited.push(this.playersLeftDuringGameStart[i]);
                    }
                    else {
                        console.log("################# handlePlayerLeftProcess No Deposit: " + this.playersLeftDuringGameStart[i].playerID + " ###################");
                        yield this.handlePlayerLeftProcess(this.playersLeftDuringGameStart[i], true, Utils_1.RemovePlayerEvent.LEFT_DURING_START, true);
                    }
                }
                let plIdsDepositedLog = "";
                for (let i = 0; i < playersWhoDeposited.length; i++) {
                    plIdsDepositedLog += playersWhoDeposited[i].playerID + ",";
                }
                console.log("################# Players Who Deposited: " + plIdsDepositedLog + " ###################");
                //commented code to let it declare the result and end the game as the result in all left before start is draw.
                //Removing other players cause error when sending money to them.
                // if (playersWhoDeposited.length != 0) {
                //     let winnerPlayer = playersWhoDeposited[playersWhoDeposited.length - 1]
                //     //now end the ludo game with this player
                //     for (let i = 0; i < playersWhoDeposited.length; i++) {
                //         if (playersWhoDeposited[i].playerID != winnerPlayer.playerID) {
                //             this.handlePlayerLeftProcess(playersWhoDeposited[i], true, RemovePlayerEvent.LEFT_DURING_START, true);
                //         }
                //     }
                // }
                //then find a winner who left at end
                this.endLudoGame(null, Utils_1.GAMEENDCONDITION.ALLLEFTBEFORESTART);
                return;
            }
            else {
                //one player is there others have left or more than 1 player is there
                //just kick the left players  the pending player will bve declared winner in startLudo function
                for (let i = 0; i < this.playersLeftDuringGameStart.length; i++) {
                    if (this.playersLeftDuringGameStart[i]) {
                        (0, LoggingHandler_1.LogMessage)(`Player Left During Game Start : ${this.playersLeftDuringGameStart[i].playerID}, Kicking Now`, this, this.playersLeftDuringGameStart[i]);
                        this.handlePlayerLeftProcess(this.playersLeftDuringGameStart[i], true, Utils_1.RemovePlayerEvent.LEFT, true);
                    }
                }
            }
            (0, logUtils_1.LogGameStateToDB)(logUtils_1.LogGameStates.MONEY_DEDUCTED, this);
            if (this.currentPlayersCount == 0) {
                console.log("################# No Players Left ###################");
                // Sending game round report because no players are left before game started as Their was some error in deducting balance
                // Usually if game round report is not sent then game stucks in starting state on load balancer
                this.sendGameRoundReport("No Players Left");
            }
            else {
                console.log("################# StartLudo Function ###################");
                this.startLudo(this.potDistribution);
            }
            // if (result) {
            //     this.startLudo(this.potDistribution);
            // } else {
            //     console.log("Deleting the game room as API failed")
            //     this.closeTable(undefined, "Removing the game because API Failed", true);
            // }
        });
    }
    sendGameRoundReport(reason) {
        //if is game started on lb is true then game round report is already sent
        // if(this.isGameStartedOnLB)
        //     this.isGameStartedOnLB = false;
        if (this.hasReportSent) {
            (0, LoggingHandler_1.LogMessage)("Game Round Report Already Sent", this);
            return;
        }
        (0, LoggingHandler_1.LogMessage)("Sending Game Round Report, reason=" + reason, this);
        this.currentGameReport.endTime = new Date();
        this.currentGameReport.isEndedCleanly = true;
        (0, LoggingHandler_1.LogMessage)(JSON.stringify(this.currentGameReport), this);
        this.hasReportSent = true;
        (0, apicalls_1.sendToAnalytics)({
            collection: apicalls_1.DBCollectionNames.GAME_ROUND_REPORTS,
            data: {
                report: this.currentGameReport,
                time: new Date(),
                serverId: process.env.SERVERID,
                gameRoundId: this.currentGameRoundId,
            }
        });
        // CallGameRoundReportAPI(this.tableGameId, this.currentGameRoundId, undefined, true, this.currentGameReport);
    }
    handleLeaveBtnClick(pl) {
        (0, LoggingHandler_1.LogMessage)("Player Left", this, pl);
        this.removePlayerFromRoom(pl, true, Utils_1.RemovePlayerEvent.LEFT);
    }
    removePlayerFromRoom(pl, closeSocket, removeEvent = Utils_1.RemovePlayerEvent.DISCONNECTED, unlockFunds = true) {
        if (!pl.updateRemovalEvent(removeEvent)) {
            console.log("Player " + pl.playerID + "  has state " + pl.removalEvent + " could not be updated to " + Utils_1.RemovePlayerEvent[removeEvent]);
            return;
        }
        if (!this.PlayersUniqIdDict[pl.plRoomNetId]) {
            console.log("Player " + pl.plRoomNetId + " not in room");
            return;
        }
        else if (removeEvent == Utils_1.RemovePlayerEvent.DISCONNECTED && this.PlayersUniqIdDict[pl.plRoomNetId].isDisconnected) {
            (0, LoggingHandler_1.LogMessage)("Player already disconnected", this, pl);
            return;
        }
        //player in the wait timer 0 -10
        if (!this.gameInStartProcess) {
            removeEvent = Utils_1.RemovePlayerEvent.PRELEFT;
            this.waitTimer = this.waitTimerVal;
            (0, timers_1.clearTimeout)(this.waitTimeout);
            console.log("################# Restarting Wait Timer ###################");
            this.waitTimeout = setTimeout(this.waitTimerLoop.bind(this), 1000);
        }
        //player in the gameinstartprocess 10+1.10+2,10+3 also deduction apis getting called
        else if (this.gameInStartProcess && !this.gameStarted) {
            removeEvent = Utils_1.RemovePlayerEvent.LEFT_DURING_START;
        }
        else if (this.gameStarted && removeEvent == Utils_1.RemovePlayerEvent.LEFT) {
            // removeEvent = RemovePlayerEvent.LEFT;
        }
        else if (this.isGameEnded && removeEvent == Utils_1.RemovePlayerEvent.DISCONNECTED) {
            removeEvent = Utils_1.RemovePlayerEvent.LEFT;
        }
        //Adding to Game Report
        if (this.currentGameReport && this.currentGameState !== Utils_1.GAMESTATE.ENDED && removeEvent !== Utils_1.RemovePlayerEvent.DISCONNECTED) {
            this.currentGameReport.leftPlayers[pl.playerID] = Utils_1.RemovePlayerEvent[removeEvent];
        }
        if (this.currentGameRoundId != '') {
            (0, LoggingHandler_1.LogMessage)(`Player Removed because of ${Utils_1.RemovePlayerEvent[removeEvent]} event`, this, pl);
        }
        (0, LoggingHandler_1.LogMessage)(`Player ${pl.playerID} removed because of ${Utils_1.RemovePlayerEvent[removeEvent]} event`, this);
        (0, LoggingHandler_1.LogMessage)(`Removing playerEvent : ${Utils_1.RemovePlayerEvent[removeEvent]} `, this, pl);
        if (removeEvent == Utils_1.RemovePlayerEvent.DISCONNECTED) {
            this.PlayersUniqIdDict[pl.plRoomNetId].isDisconnected = true;
            this.sendMessageToAll({ t: Utils_1.MSGTYPE.PLEFT, data: pl.plRoomNetId, playerId: pl.playerID, reason: removeEvent });
        }
        else if (removeEvent == Utils_1.RemovePlayerEvent.LEFT_DURING_START) {
            //check if pl is already in the list
            let isAlreadyInList = false;
            for (let i = 0; i < this.playersLeftDuringGameStart.length; i++) {
                if (this.playersLeftDuringGameStart[i].playerID == pl.playerID) {
                    isAlreadyInList = true;
                    (0, LoggingHandler_1.LogMessage)(`Player ${pl.playerID} Already found in the leftDuringStartList, Count : ${this.playersLeftDuringGameStart.length}`, this, pl);
                    break;
                }
            }
            if (!isAlreadyInList) {
                this.playersLeftDuringGameStart.push(pl);
                (0, LoggingHandler_1.LogMessage)(`Added To Left During Game Start List, Count : ${this.playersLeftDuringGameStart.length}`, this, pl);
            }
        }
        else {
            this.handlePlayerLeftProcess(pl, closeSocket, removeEvent, unlockFunds);
        }
    }
    handlePlayerLeftProcess(pl, closeSocket, removeEvent, unlockFunds) {
        let request = {
            pl: pl,
            closeSocket: closeSocket,
            removeEvent: removeEvent,
            unlockFunds: unlockFunds
        };
        this.HandleLeftProcessQueue.push(request);
    }
    processHandleLeftQueue() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.resultCalculationStarted)
                return;
            this.isInHandlingLeftQueueProcess = true;
            let flagGameShouldEndOnlyOnePlayerLeft = false;
            while (this.HandleLeftProcessQueue.length > 0) {
                if (this.resultCalculationStarted)
                    break;
                let request = this.HandleLeftProcessQueue.shift();
                console.log("**handlePlayerLeftProcessExecute " + " length =(" + this.HandleLeftProcessQueue.length + ") pl = " + request.pl.playerID);
                yield this.handlePlayerLeftProcessExecute(request.pl, request.closeSocket, request.removeEvent, request.unlockFunds);
                console.log("**handlePlayerLeftProcessExecute DONE " + " length =(" + this.HandleLeftProcessQueue.length + ") pl = " + request.pl.playerID);
                if (this.currentPlayersCount == 1 && this.gameStarted && !this.isGameEnded) {
                    flagGameShouldEndOnlyOnePlayerLeft = true;
                    break;
                }
            }
            this.isInHandlingLeftQueueProcess = false;
            if (flagGameShouldEndOnlyOnePlayerLeft) {
                yield this.endLudoGame({}, Utils_1.GAMEENDCONDITION.ALLOPPONENTLEFT);
            }
        });
    }
    setIntervalForProcessHandleLeftQueue() {
        setInterval(() => {
            if (this.HandleLeftProcessQueue.length > 0 && !this.isInHandlingLeftQueueProcess)
                this.processHandleLeftQueue();
        }, 1000);
    }
    handlePlayerLeftProcessExecute(pl, closeSocket, removeEvent, unlockFunds) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            console.log("handlePlayerLeftProcess " + pl.playerID);
            if (unlockFunds) {
                let gameEndReason = '';
                if (pl.resultReason != '') {
                    gameEndReason = pl.resultReason;
                }
                else if (pl.hasDeposited)
                    gameEndReason = (removeEvent == Utils_1.RemovePlayerEvent.TIMEOUT ? `You lost because you skipped three times.` : `You lost because you left the game midway.`);
                // let hasPlDeposited = this.currentGameReport ? this.currentGameReport.players.includes(pl.playerID) : false;
                yield (0, apicalls_1.CallLockFundsAPI)(pl.playerID, 0, server_1.Table.currentGameRoundId, false, pl.hasDeposited, gameEndReason);
            }
            (0, apicalls_1.CallUpdatePlayerStatus)(parseInt(pl.playerID), DataTypes_1.GlobalPlayerState.IN_APP, "", -1, -1);
            for (let key of Object.keys(this.board.Tokens)) {
                let token = this.board.Tokens[key];
                if (token.tokenType == pl.plRoomNetId) {
                    this.board.Tokens[key].score = 0;
                    (0, LudoBoard_1.addTokenToPlace)(this.board.Tokens[key], this.board.Tokens[key].startPos.postionNum, this.board);
                    this.board.Tokens[key].score = 0;
                }
            }
            if (this.gameInStartProcess)
                this.leftPlayersForClientSending.push(pl);
            delete this.PlayersUniqIdDict[pl.plRoomNetId];
            this.sendMessageToAll({ t: Utils_1.MSGTYPE.PLEFT, data: pl.plRoomNetId, reason: removeEvent });
            if (pl.plRoomNetId != -1)
                this.currentPlayersCount--;
            console.log("After pl left " + pl.playerID + " currentPlayersCount", this.currentPlayersCount);
            if (closeSocket && pl.plSocket.isConnectionAlive) {
                console.log("Closing socket in handle player left process");
                try {
                    (_a = pl.plSocket) === null || _a === void 0 ? void 0 : _a.end();
                }
                catch (e) {
                    console.log(e);
                }
            }
        });
    }
    cleanUpTable(reason, isErrored, needToSendGameRoundReport) {
        // this.currentGameState = GAMESTATE.RESTARTING;
        console.log("cleanUpTable");
        (0, LoggingHandler_1.LogMessage)(`CleaningUp Table, reason=${reason}`, this);
        (0, timers_1.clearTimeout)(this.turnTimeout);
        (0, timers_1.clearTimeout)(this.gamePlayTimeout);
        (0, timers_1.clearTimeout)(this.waitTimeout);
        console.log("closing callEndGameAlertAPI");
        // Ending Log File
        // LogEnd(this);
        (0, apicalls_1.CallDeleteWalletAPI)(this.currentGameRoundId).then((result) => {
            console.log("CallDeleteWalletAPI");
            console.log(result);
            if (result) {
                console.log("############# Ending the game server #############");
                (0, server_1.resetTable)();
            }
        });
        (0, LoggingHandler_1.LogEnd)(this);
    }
    // async closeTable(errorData: string = "", reason : string, isErrored : boolean, errCode : ErrorCode) {
    //     console.log("closing the table method")
    //     LogMessage(`Closing Table, reason=${reason}, errorData=${errorData}`, this);
    //     this.sendMessageToAll({ t: MSGTYPE.ERROR, data: errorData, code : errCode})
    //     clearTimeout(this.turnTimeout)
    //     clearTimeout(this.gamePlayTimeout)
    //     clearTimeout(this.waitTimeout)
    //     console.log("closing callEndGameAlertAPI")
    //     // await callEndGameAlertAPI(this.tableGameId, reason, isErrored)
    //     //TODO : Add Call Game End Alert
    //     // await CallCloseTableAPI(this.tableGameId, this.currentGameRoundId, {
    //     //     isErrored : isErrored,
    //     //     reason : reason
    //     // });
    //     console.log("delete GameRoomsDict")
    //
    //     delete GameRoomsDict[this.tableGameId]
    //
    // }
    sendMessageToOthers(content, plRoomNetId) {
        for (let i = 0; i < this.maxPlayers; i++)
            if (this.PlayersUniqIdDict[i] != null && i != plRoomNetId && this.PlayersUniqIdDict[i]) {
                this.PlayersUniqIdDict[i].sendMessage(content);
            }
    }
    sendMessageToAll(content) {
        for (let i = 0; i < this.maxPlayers; i++)
            if (this.PlayersUniqIdDict[i] != null)
                this.PlayersUniqIdDict[i].sendMessage(content);
    }
    getRoomSnap(withRoomId = true) {
        // other players with colors , names and profile pic urls
        let snap = [];
        for (let i = 0; i < this.maxPlayers; i++) {
            if (this.PlayersUniqIdDict[i] != null && this.PlayersUniqIdDict[i]) {
                let msg = { pName: this.PlayersUniqIdDict[i].plName, pImage: this.PlayersUniqIdDict[i].profileImage, pDefaultId: this.PlayersUniqIdDict[i].playerID };
                if (withRoomId) {
                    msg.plId = i;
                }
                snap.push(msg);
            }
        }
        return snap;
    }
    getStats() {
        let stats = {};
        for (let i = 0; i < this.maxPlayers; i++) {
            if (this.PlayersUniqIdDict[i] != null && this.PlayersUniqIdDict[i]) {
                stats[this.PlayersUniqIdDict[i].plRoomNetId] = {
                    score: this.PlayersUniqIdDict[i].score,
                    health: 3 - this.PlayersUniqIdDict[i].skippedTurns
                };
            }
        }
        return stats;
    }
    startLudo(potDist) {
        (0, LoggingHandler_1.LogMessage)("Starting Ludo Game", this);
        this.currentGameState = Utils_1.GAMESTATE.IN_GAME;
        //check again before starting
        if (this.currentPlayersCount == 1) {
            this.endLudoGame({}, Utils_1.GAMEENDCONDITION.ALLOPPONENTLEFT);
        }
        else if (this.currentPlayersCount > 1) {
            (0, LoggingHandler_1.LogMessage)("Timer Left : " + this.gamePlayTimer, this);
            this.isGameEnded = false;
            this.gameStarted = true;
            this.currPlAtTurn = this.PlayersUniqIdDict[this.getFirstPlayerId()];
            this.currPlAtTurn.state = Player_1.PLAYERSTATE.ROLLDICE;
            let gameStartMsg = {
                t: Utils_1.MSGTYPE.GAMESTART,
                snap: this.getRoomSnap(true),
                turn: this.currPlAtTurn.plRoomNetId,
                pot: potDist,
                gameRoundId: this.currentGameRoundId
            };
            for (let i = 0; i < this.maxPlayers; i++)
                if (this.PlayersUniqIdDict[i] != null) {
                    gameStartMsg.plId = i;
                    this.PlayersUniqIdDict[i].sendMessage(gameStartMsg);
                }
            //   console.log(gameStartMsg)
            (0, timers_1.clearTimeout)(this.gamePlayTimeout);
            (0, timers_1.clearTimeout)(this.turnTimeout);
            this.gamePlayTimer = this.gameTimerVal;
            this.gamePlayTimeout = setTimeout(this.gamePlayLoop.bind(this), 1000);
            this.turnTimeout = setTimeout(this.turnTimerLoop.bind(this), 1000);
        }
    }
    handleSwitchTable(pl) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.stopRestart || this.gameInStartProcess) {
                console.log("Restarting in progress");
                pl.sendMessage({
                    t: "switchFailed"
                });
                return;
            }
            pl.sendMessage({
                t: Utils_1.MSGTYPE.SWITCH_SUCCESS,
                id: Utils_1.ServerID
            });
            this.removePlayerFromRoom(pl, false, Utils_1.RemovePlayerEvent.SWITCHED);
            console.log("Switching Table");
        });
    }
    handleDiceRoll(pl) {
        (0, LoggingHandler_1.LogMessage)("Player " + pl.plRoomNetId + " rolled dice with state : " + Player_1.PLAYERSTATE[pl.state], this, pl);
        if (this.isGameEnded)
            return;
        //check player exists
        if (pl.state == Player_1.PLAYERSTATE.ROLLDICE) {
            pl.state = Player_1.PLAYERSTATE.ROLLED;
            (0, timers_1.clearTimeout)(this.turnTimeout);
            // create a random number
            let randDiceRoll = Math.floor(Math.random() * 6) + 1;
            this.currDiceRollVal = randDiceRoll;
            let diceRollNotif = {
                t: "diceRollNotif",
                plId: pl.plRoomNetId
            };
            this.sendMessageToAll(diceRollNotif);
            (0, LoggingHandler_1.LogMessage)("Dice Roll : " + randDiceRoll, this, pl);
            if (randDiceRoll == 6) {
                if (pl.sixRollStreak == 2) {
                    //             console.log("You rolled six thrice cancelling last run");
                    pl.state = Player_1.PLAYERSTATE.WAITING;
                    pl.sixRollStreak = 0;
                    // send to next player now
                    let playerThrowingThreeSix = this.currPlAtTurn.plRoomNetId;
                    //this.currPlAtTurn =    this.PlayersUniqIdDict[
                    this.getNextPlayerForTurn();
                    //]
                    if (this.gameShouldEndNow && this.currPlAtTurn.plRoomNetId == this.getFirstPlayerId()) {
                        this.endLudoGame({}, Utils_1.GAMEENDCONDITION.THREESIX);
                    }
                    else {
                        let threeSixMsg = {
                            t: Utils_1.MSGTYPE.THREESIX,
                            plId: playerThrowingThreeSix,
                            nextRoll: this.currPlAtTurn.plRoomNetId
                        };
                        this.currPlAtTurn.state = Player_1.PLAYERSTATE.ROLLDICE;
                        setTimeout(() => {
                            this.sendMessageToAll(threeSixMsg);
                        }, 800);
                        setTimeout(() => {
                            this.sendMessageToAll({
                                t: Utils_1.MSGTYPE.NEXTTURN,
                                nextRoll: this.currPlAtTurn.plRoomNetId
                            });
                            this.turnTimer = this.turnTimeVal;
                            this.turnTimeout = setTimeout(this.turnTimerLoop.bind(this), 1000);
                        }, 2000);
                    }
                    return;
                }
                //   currentPlayerRepeat = true;
                //   pl.sixRollStreak++
                //     pl.state = PLAYERSTATE.ROLLDICE
            }
            else {
                pl.sixRollStreak = 0;
            }
            let movabaleTokens = [];
            for (let key of Object.keys(this.board.Tokens)) {
                let token = this.board.Tokens[key];
                if (token.tokenType == pl.plRoomNetId) {
                    if (token.currPlace.isHomePoint || token.currPlace.CarpetType != Token_1.TokenType.NONE) {
                        let reqdDiceNum = token.homePosNum - token.currPlace.postionNum;
                        if (randDiceRoll <= reqdDiceNum)
                            movabaleTokens.push(token.tokenId);
                    }
                    else {
                        movabaleTokens.push(token.tokenId);
                    }
                }
            }
            pl.lastMovableTokens = [...movabaleTokens];
            //   if (this.gameShouldEndNow && this.currPlAtTurn.plRoomNetId == 0) {
            //    this.endLudoGame({}, GAMEENDCONDITION.THREESIX)
            if (movabaleTokens.length == 0) {
                this.getNextPlayerForTurn();
                if (this.gameShouldEndNow && this.currPlAtTurn.plRoomNetId == this.getFirstPlayerId()) {
                    this.endLudoGame({}, Utils_1.GAMEENDCONDITION.NOVALIDMODE);
                }
                else {
                    let diceRollMsg = {
                        t: Utils_1.MSGTYPE.DICEROLLRES,
                        plId: pl.plRoomNetId,
                        dice: randDiceRoll,
                        movable: movabaleTokens,
                        nextroll: this.currPlAtTurn.plRoomNetId,
                    };
                    this.currPlAtTurn.state = Player_1.PLAYERSTATE.ROLLDICE;
                    this.turnTimer = this.turnTimeVal;
                    this.turnTimeout = setTimeout(this.turnTimerLoop.bind(this), 1000);
                    setTimeout(() => {
                        this.sendMessageToAll(diceRollMsg);
                    }, 800);
                }
            }
            else {
                let diceRollMsg = {
                    t: Utils_1.MSGTYPE.DICEROLLRES,
                    plId: pl.plRoomNetId,
                    dice: randDiceRoll,
                    movable: movabaleTokens
                };
                setTimeout(() => {
                    this.sendMessageToAll(diceRollMsg);
                    this.turnTimer = this.turnTimeVal;
                    this.turnTimeout = setTimeout(this.turnTimerLoop.bind(this), 1000);
                    pl.state = Player_1.PLAYERSTATE.SELECTTOKEN;
                }, 800);
            }
        }
        else {
            console.log("It is not player " + pl.plRoomNetId + "'s turn");
        }
        //send back to player
    }
    handleTokenMove(player, tokenNum) {
        if (player.plRoomNetId != this.currPlAtTurn.plRoomNetId) {
            console.log("It is not this player's turn!");
            return;
        }
        //check player exists
        if (this.isGameEnded) {
            console.log("this game is ended already");
            return;
        }
        if (this.board.Tokens[tokenNum].currPlace.CarpetType != Token_1.TokenType.NONE) {
            let reqdDiceNum = this.board.Tokens[tokenNum].homePosNum - this.board.Tokens[tokenNum].currPlace.postionNum;
            if (this.currDiceRollVal != null && this.currDiceRollVal > reqdDiceNum) {
                let invalidMoveMsg = {
                    t: Utils_1.MSGTYPE.INVALIDMOVE
                };
                player.sendMessage(invalidMoveMsg);
                console.log("this is an invalid move");
                return;
            }
        }
        //check if it is player's turn
        if (player.state == Player_1.PLAYERSTATE.SELECTTOKEN) {
            (0, timers_1.clearTimeout)(this.turnTimeout);
            if (this.currDiceRollVal != null && this.board.Tokens[tokenNum] != null) {
                //    console.log("moving token on board")
                this.moveTokenOnBoard(player, this.board.Tokens[tokenNum], this.currDiceRollVal);
            }
            else {
                //  console.log(JSON.stringify(this.Board.Tokens))
                //  console.log("token is null " + tokenNum + " === " + this.Board.Tokens[tokenNum])
            }
            //  console.log("Player Select Token")
        }
        else {
            //   console.log("Player Select Token")
        }
        // Now check for which player has next turn and send message to everybody about it!
    }
    moveTokenOnBoard(pl, tokenToMove, diceRun) {
        // move token on board
        let currentPlayerRepeat = false;
        pl.state = Player_1.PLAYERSTATE.WAITING;
        let tokenMovePositions = [];
        if (diceRun == 6) {
            currentPlayerRepeat = true;
            pl.sixRollStreak++;
            pl.state = Player_1.PLAYERSTATE.ROLLDICE;
        }
        let moveTokensData = [];
        if (diceRun >= 1 && diceRun <= 6) {
            //   console.log("dice run =" + diceRun)
            let initialBoardPos = tokenToMove.currPlace;
            for (let i = 0; i < diceRun; i++) {
                if (initialBoardPos.nextPositionNum.length == 2 && this.board.LudoBoard[initialBoardPos.nextPositionNum[1]].CarpetType == tokenToMove.tokenType) {
                    tokenMovePositions.push(this.board.LudoBoard[initialBoardPos.nextPositionNum[1]].postionNum);
                    initialBoardPos = this.board.LudoBoard[initialBoardPos.nextPositionNum[1]];
                }
                else {
                    tokenMovePositions.push(this.board.LudoBoard[initialBoardPos.nextPositionNum[0]].postionNum);
                    initialBoardPos = this.board.LudoBoard[initialBoardPos.nextPositionNum[0]];
                }
            }
            let finalPosition = initialBoardPos;
            // checks for final landing positions 
            //  console.log("final landing positions " + finalPosition)
            if (finalPosition.isSafePoint) {
                (0, LudoBoard_1.addTokenToPlace)(tokenToMove, finalPosition.postionNum, this.board);
            }
            else if (finalPosition.isHomePoint) {
                (0, LudoBoard_1.addTokenToPlace)(tokenToMove, finalPosition.postionNum, this.board);
                tokenToMove.score += 56;
                currentPlayerRepeat = true;
            }
            else {
                if (finalPosition.currToken.length == 1) {
                    if (finalPosition.currToken[0].tokenType != tokenToMove.tokenType) {
                        // here the token is enemy token we need to cut it here
                        // send enemy token back!
                        let tokenCut = finalPosition.currToken[0];
                        tokenCut.score = 0;
                        (0, LudoBoard_1.addTokenToPlace)(finalPosition.currToken[0], finalPosition.currToken[0].startPos.postionNum, this.board);
                        moveTokensData.push({ tokenId: tokenCut.tokenId, pos: [tokenCut.currPlace.postionNum], isCut: true });
                        // give me extra roll
                        pl.state = Player_1.PLAYERSTATE.ROLLDICE;
                        currentPlayerRepeat = true;
                    }
                }
                // place my token here
                (0, LudoBoard_1.addTokenToPlace)(tokenToMove, finalPosition.postionNum, this.board);
            }
        }
        //  console.log("TOKEN MOVE POS " + JSON.stringify(tokenMovePositions))
        moveTokensData.push({ tokenId: tokenToMove.tokenId, pos: tokenMovePositions, isCut: false });
        tokenToMove.score += diceRun;
        let moveTokenMsg = {};
        let nextPlayerTurn = currentPlayerRepeat ? this.currPlAtTurn.plRoomNetId : this.getNextPlayerForTurn();
        //  console.log("after calc")
        let flagAllTokenReached = true;
        //Check for all tokens in condition
        for (let key of Object.keys(this.board.Tokens)) {
            let token = this.board.Tokens[key];
            if (token.tokenType == tokenToMove.tokenType && !token.currPlace.isHomePoint) {
                flagAllTokenReached = false;
                break;
            }
        }
        if (flagAllTokenReached) {
            this.endLudoGame({}, Utils_1.GAMEENDCONDITION.ALLTOKENSIN);
        }
        else if (this.gameShouldEndNow && nextPlayerTurn == this.getFirstPlayerId() && !currentPlayerRepeat) {
            (0, LoggingHandler_1.LogMessage)(`gameShouldEndNow ${this.gameShouldEndNow}, nextPlayerTurn ${nextPlayerTurn == this.getFirstPlayerId()}, currentPlayerRepeat ${!currentPlayerRepeat}`, this);
            this.endLudoGame(moveTokensData, Utils_1.GAMEENDCONDITION.MOVTOKEN);
        }
        else {
            moveTokenMsg = {
                t: Utils_1.MSGTYPE.MOVTOKEN,
                data: moveTokensData,
                nextroll: nextPlayerTurn,
                gState: this.getLudoState()
            };
            this.currPlAtTurn = this.PlayersUniqIdDict[moveTokenMsg.nextroll];
            this.currPlAtTurn.state = Player_1.PLAYERSTATE.ROLLDICE;
            this.turnTimer = this.turnTimeVal;
            this.turnTimeout = setTimeout(this.turnTimerLoop.bind(this), 1000);
            this.sendMessageToAll(moveTokenMsg);
            //   console.log(moveTokenMsg)
        }
    }
    gamePlayLoop() {
        this.gamePlayTimer--;
        let timerMsg = {
            t: Utils_1.MSGTYPE.TIMER,
            data: this.gamePlayTimer
        };
        this.sendMessageToAll(timerMsg);
        if (this.gamePlayTimer == 0) {
            // here end the game forcefully and declare winner
            this.gameShouldEndNow = true;
            //    console.log("THE GAME TIMER ==0")
            console.log("Stopping the game");
        }
        else {
            this.gamePlayTimeout = setTimeout(this.gamePlayLoop.bind(this), 1000);
        }
        if (this.gamePlayTimer < 0) {
            (0, apicalls_1.sendToAnalytics)({
                collection: apicalls_1.DBCollectionNames.UnexpectedErrors,
                data: {
                    msg: "Game timer is less than 0",
                    tableId: Utils_1.TableID,
                    gameRoundId: this.currentGameRoundId,
                    gamePlayTimer: this.gamePlayTimer,
                    time: new Date(),
                }
            });
        }
    }
    endLudoGame(moveTokensData, msg) {
        return __awaiter(this, void 0, void 0, function* () {
            this.resultCalculationStarted = true;
            //await for isInHandlingLeftQueueProcess to be false
            while (this.isInHandlingLeftQueueProcess) {
                //await for 1 s
                yield new Promise(resolve => setTimeout(resolve, 1000));
            }
            // if (this.isGameEnded) {
            //     LogMessage("Returning as game is already ended.... " + msg, this);
            //     return;
            // }
            //stop turn timer
            if (this.turnTimeout) {
                (0, LoggingHandler_1.LogMessage)("Clearing turn timeout", this);
                (0, timers_1.clearTimeout)(this.turnTimeout);
            }
            console.log("Cleared turn timeout");
            this.isGameEnded = true; //give extra turns as needed
            (0, LoggingHandler_1.LogMessage)("Ending Game.... " + msg, this);
            this.currentGameState = Utils_1.GAMESTATE.RESULT;
            // LogMessage("Ending Game....", this);
            //moved tokens
            //three six
            //turn skipped
            //no valid move
            //all tokens in already
            // game over on all tokens
            if (this.currentGameReport)
                this.currentGameReport.reason = msg;
            let scoreData = this.getLudoState().score;
            let playersIncludedInResult = [];
            for (let i = 0; i < this.maxPlayers; i++) {
                if (this.PlayersUniqIdDict[i] && this.PlayersUniqIdDict[i] != undefined) {
                    playersIncludedInResult.push(this.PlayersUniqIdDict[i]);
                }
            }
            this.bubbleSort(playersIncludedInResult, playersIncludedInResult.length);
            let winAmountData = [];
            //check for ties
            // implement so top player share top 
            let positions = {};
            positions[0] = [];
            positions[1] = [];
            positions[2] = [];
            positions[3] = [];
            let nextPositionToFill = 0;
            for (let j = 0; j < playersIncludedInResult.length; j++) {
                let nextpl = playersIncludedInResult[j];
                for (let i = 0; i < 4; i++) {
                    if (positions[i] == null) {
                        console.log("position " + i + " is null");
                        continue;
                    }
                    else {
                        // @ts-ignore
                        if (i >= nextPositionToFill && positions[i].length == 0) {
                            console.log("position " + i + " is is empty adding here ");
                            // @ts-ignore
                            positions[i].push(nextpl);
                            nextPositionToFill++;
                            break;
                        }
                        // @ts-ignore
                        else if (positions[i].length > 0 && positions[i][0].score == nextpl.score) {
                            console.log("position " + i + " is filled with same score ");
                            // @ts-ignore
                            positions[i].push(nextpl);
                            nextPositionToFill++;
                            break;
                        }
                    }
                }
            }
            (0, logUtils_1.LogGameStateToDB)(logUtils_1.LogGameStates.RESULT_CALCULATED, this);
            (0, LoggingHandler_1.LogMessage)("Result Calcualted", this);
            for (let i = 0; i < 4; i++) {
                let potAmt = new Money_1.Money(0);
                if (positions[i].length <= 0)
                    continue;
                let isDraw = false;
                let numberOfPlsDeposited = Object.keys(this.currentGameReport.entryFees).length;
                if (playersIncludedInResult.length == positions[i].length && numberOfPlsDeposited == playersIncludedInResult.length) {
                    //if all players have same score then split the pot equally then it is a tie and we don't need to cut rake
                    //if we cut rake in this situation then amounts will be in negative in result screen
                    isDraw = true;
                }
                let plsInResultForLog = [];
                for (let j = 0; j < playersIncludedInResult.length; j++) {
                    plsInResultForLog.push(playersIncludedInResult[j].playerID);
                }
                (0, LoggingHandler_1.LogMessage)("playersIncludedInResult" + JSON.stringify(plsInResultForLog), this);
                for (let j = 0; j < positions[i].length; j++) {
                    potAmt.add(new Money_1.Money(this.potDistribution[i + j])); // += this.potDistribution[i + j]
                }
                (0, LoggingHandler_1.LogMessage)("potAmt " + potAmt.value + "positions[i].length " + positions[i].length, this);
                console.log("potAmt " + potAmt.value + " positions[i].length " + positions[i].length);
                let potShare = potAmt.divideIntoPart(positions[i].length); //new Money(potAmt / positions[i].length);
                (0, LoggingHandler_1.LogMessage)("potShare -  " + potShare.value, this);
                console.log("potShare -  " + potShare.value);
                for (let j = 0; j < positions[i].length; j++) {
                    if (potAmt.isLt(potShare)) {
                        potShare = potAmt.copy();
                    }
                    potAmt.subtract(potShare);
                    if (j == positions[i].length - 1 && potAmt.isGt(Money_1.Money.Zero)) {
                        potShare.add(potAmt);
                    }
                    console.log("potShare " + potShare.value);
                    (0, LoggingHandler_1.LogMessage)("potShare -  " + potShare.value, this);
                    positions[i][j].winAmount = potShare.copy();
                    (0, LoggingHandler_1.LogMessage)("positions[i][j].winAmount -  " + positions[i][j].winAmount.value, this);
                    winAmountData.push({ name: positions[i][j].plName, plId: positions[i][j].plRoomNetId, score: positions[i][j].score, win: positions[i][j].winAmount, isDraw: isDraw });
                }
            }
            // for (let i = 0; i < winData.length; i++) {
            //     winAmountData.push({ name: winData[i].plName, plId: winData[i].plRoomNetId, score: winData[i].score, win: this.potDistribution[i] })
            // }
            console.log("=============================");
            console.log("Win Details of " + this.currentGameRoundId);
            console.log(winAmountData);
            (0, LoggingHandler_1.LogMessage)(JSON.stringify(winAmountData), this);
            (0, LoggingHandler_1.LogMessage)(JSON.stringify(winAmountData), this);
            (0, apicalls_1.sendToAnalytics)({
                collection: apicalls_1.DBCollectionNames.WIN_REPORT,
                data: {
                    report: winAmountData,
                    tableId: Utils_1.TableID,
                    gameRoundId: this.currentGameRoundId,
                    serverId: process.env.SERVERID,
                    time: new Date(),
                }
            });
            console.log("==============================");
            let playersInvolvedInRake = winAmountData.filter((result) => {
                return result.win.isGt(new Money_1.Money(this.entryFee));
            }).map((result) => {
                return this.PlayersUniqIdDict[result.plId].playerID;
            });
            let finalWinData = yield this.completeGameEndCalls(winAmountData, msg);
            (0, logUtils_1.LogGameStateToDB)(logUtils_1.LogGameStates.MONEY_CREDITED, this, finalWinData); //Log To DB
            let allLeftPlayers = this.leftPlayersForClientSending.map((pl) => {
                // if(!this.PlayersUniqIdDict[pl.plRoomNetId]) 
                return { name: pl.plName, plId: pl.plRoomNetId, score: pl.score, win: 0, isDraw: false };
            });
            //compare if finalWinData has similar data as allLeftPlayers 
            //if yes then remove that player from allLeftPlayers
            for (let i = 0; i < finalWinData.length; i++) {
                let index = allLeftPlayers.findIndex((pl) => { return pl.plId == finalWinData[i].plId; });
                if (index != -1) {
                    allLeftPlayers.splice(index, 1);
                }
            }
            let gameEndMsg = {
                t: Utils_1.MSGTYPE.GAMEENDED,
                data: moveTokensData,
                msg: msg,
                gState: this.getLudoState(),
                winData: finalWinData,
                leftList: allLeftPlayers.filter((pl) => { return pl != undefined; }),
            };
            this.currentGameState = Utils_1.GAMESTATE.ENDED;
            console.log(gameEndMsg);
            this.sendMessageToAll(gameEndMsg);
            if (this.rake.value > 0) {
                yield (0, apicalls_1.CallRakeCreditAPI)(this.rake.value, this.currentGameRoundId, playersInvolvedInRake);
            }
            else {
                console.log("############### Game had zero rake ###############" + this.rake.value);
            }
            (0, logUtils_1.LogGameStateToDB)(logUtils_1.LogGameStates.GAME_END, this); //Log To DB
            this.resultCalculationStarted = false;
            // callTableGameEndingAPI(GamesappGameID, this.tableGameId, this.currentGameSession)
            //Game End Report
            (0, timers_1.clearTimeout)(this.turnTimeout);
            (0, timers_1.clearTimeout)(this.gamePlayTimeout);
            // await new Promise(r => setTimeout(r, 1000));
            // this.kickInActivePlayers();
            if (this.currentPlayersCount > 0) {
                //  const reserveServerResponse = await CallReserveServerAPI();
                // if(reserveServerResponse)
                yield this.kickAllPlayers(null);
            }
            if (this.currentGameReport && !this.hasReportSent) {
                this.currentGameReport.endTime = new Date();
                (0, LoggingHandler_1.LogMessage)("Sending Game Round Report", this);
                this.hasReportSent = true;
                (0, apicalls_1.sendToAnalytics)({
                    collection: apicalls_1.DBCollectionNames.GAME_ROUND_REPORTS,
                    data: {
                        report: this.currentGameReport,
                        time: new Date(),
                        serverId: process.env.SERVERID,
                        gameRoundId: this.currentGameRoundId,
                    }
                });
                // let result = await CallGameRoundReportAPI(this.tableGameId, this.currentGameRoundId, undefined, false, this.currentGameReport);
            }
            this.cleanUpTable("Game Ended", false, false);
            // if(result)
            // {
            //     // if(this.stopRestart)
            //     // {
            //     //     LogMessage("Stopping Table Game Restart", this);
            //     //     console.log("Table Game restarting stop : " + this.tableGameId);
            //     // }
            //     // else
            //     // {
            //     //     LogMessage("Restarting Game..", this);
            //     //     this.restartGame()
            //     // }
            // } else 
            // {
            //     // if(this.stopRestart)
            //     // {
            //     //     LogMessage("Stopping Table Game Restart", this);
            //     //     console.log("Table Game Stopping : ") + this.tableGameId;
            //     // }
            // }
        });
    }
    kickAllPlayers(serverDetails) {
        return __awaiter(this, void 0, void 0, function* () {
            const keys = Object.keys(this.PlayersUniqIdDict);
            (0, LoggingHandler_1.LogMessage)("Kicking PLayers " + keys.length, this);
            for (let i = 0; i < keys.length; i++) {
                const player = this.PlayersUniqIdDict[keys[i]];
                if (player) {
                    let gameEndReason = "";
                    if (player.resultReason !== "" && player.hasDeposited) {
                        gameEndReason = player.resultReason;
                    }
                    console.log("############## Unlocking funds for player " + player.playerID + " ##############");
                    const unlockFunds = yield (0, apicalls_1.CallLockFundsAPI)(player.playerID, 0, this.currentGameRoundId, false, player.hasDeposited, gameEndReason);
                    if (unlockFunds.success) {
                        player.sendMessage({
                            t: "restartGame",
                            data: serverDetails === null ? undefined : {
                                serverId: serverDetails.id,
                                serverAddress: serverDetails.address,
                            }
                        });
                    }
                    this.removePlayerFromRoom(player, true, Utils_1.RemovePlayerEvent.KICKED, false);
                }
            }
        });
    }
    // kickAllPlayersAndStopGame(playersStatus : any)
    // {
    //     const keys = Object.keys(playersStatus);
    //     LogMessage("Kicking PLayers " + keys.length, this);
    //
    //     for(let i = 0; i <keys.length; i++)
    //     {
    //         if(!playersStatus[keys[i]])
    //         {
    //             const plId = this.getSeatId(keys[i]);
    //             const player = this.PlayersUniqIdDict[plId];
    //
    //             if(player)
    //                 this.removePlayerFromRoom(player, true, RemovePlayerEvent.KICKED)
    //         }
    //     }
    //
    //
    //     LogMessage("Restarting game..", this);
    //     if(this.stopRestart)
    //     {
    //         LogMessage("Stopping Table Game Restart", this);
    //         console.log("Table Game restarting stop : " + this.tableGameId);
    //
    //         this.closeTable("Manual Close", "Stopping restarting due to maintainance", true, ErrorCode.RESTART_GAME_FAILED).then(r => {
    //             console.log("Table Game Closed : " + this.tableGameId);
    //         });
    //     } else
    //         this.restartGame()
    //
    // }
    // kickInActivePlayers()
    // {
    //     LogMessage("Kicking Inactive Players", this);
    //
    //     for(let i = 0; i < this.maxPlayers; i++)
    //     {
    //         if(this.PlayersUniqIdDict[i] && this.PlayersUniqIdDict[i].isDisconnected)
    //         {
    //             this.removePlayerFromRoom(this.PlayersUniqIdDict[i], true, RemovePlayerEvent.KICKED)
    //         }
    //     }
    // }
    getSeatId(playerId) {
        for (let i = 0; i < this.maxPlayers; i++) {
            if (this.PlayersUniqIdDict[i] && this.PlayersUniqIdDict[i].playerID == playerId) {
                return i.toString();
            }
        }
        return (-1).toString();
    }
    swap(arr, xp, yp) {
        var temp = arr[xp];
        arr[xp] = arr[yp];
        arr[yp] = temp;
    }
    // An optimized version of Bubble Sort
    bubbleSort(arr, n) {
        var i, j;
        for (i = 0; i < n - 1; i++) {
            for (j = 0; j < n - i - 1; j++) {
                if (arr[j].score < arr[j + 1].score) {
                    this.swap(arr, j, j + 1);
                }
            }
        }
    }
    completeGameEndCalls(winAmountData, gameEndReason) {
        return __awaiter(this, void 0, void 0, function* () {
            let returnWinData = [];
            let sortDependsOnScoreInDescendingOrder = winAmountData.sort((a, b) => b.score - a.score);
            for (let i = 0; i < winAmountData.length; i++) {
                if (this.PlayersUniqIdDict[winAmountData[i].plId]) {
                    if (this.currentGameReport) {
                        this.currentGameReport.result[this.PlayersUniqIdDict[winAmountData[i].plId].playerID] = {
                            amount: winAmountData[i].win.value,
                            score: winAmountData[i].score
                        };
                    }
                    // let result = await callUpdateCoinWalletAPI(
                    //     this.PlayersUniqIdDict[winAmountData[i].plId].playerID,
                    //     GamesappGameID,
                    //     this.tableGameId,
                    //     winAmountData[i].win.toString(),
                    //     "PLAYER_WIN",
                    //     true,
                    //     "Ludo Win", this.currentGameSession);
                    (0, LoggingHandler_1.LogMessage)(`Crediting Amount : ${winAmountData[i].win.value}`, this, this.PlayersUniqIdDict[winAmountData[i].plId]);
                    // const truncateAmount = Math.trunc(winAmountData[i].win * 100) / 100;
                    // let result = await CallCreditBalanceAPI(winAmountData[i].win.value.toString(),
                    //                 this.PlayersUniqIdDict[winAmountData[i].plId].playerID,
                    //                 TableID,
                    //                 this.currentGameRoundId,
                    //                 (winAmountData[i].isDraw ? CreditReasons.DRAW : winAmountData[i].win.isGt(Money.Zero)? CreditReasons.WIN : CreditReasons.LOSE)
                    //                 //if isDraw is true then don't need to cut rake so we are pasing CreditReasons.DRAW
                    //                 );
                    let player = this.PlayersUniqIdDict[winAmountData[i].plId];
                    try {
                        this.populateReason(gameEndReason, winAmountData, i, player, sortDependsOnScoreInDescendingOrder);
                    }
                    catch (e) {
                        console.log(e);
                        console.log("############## Error in populateReason ###########");
                    }
                    if (winAmountData[i].win.value <= 0) {
                        (0, LoggingHandler_1.LogMessage)(`Winning Amount is 0`, this, this.PlayersUniqIdDict[winAmountData[i].plId]);
                        console.log(`Winning Amount is 0 skipping crediting for ${this.PlayersUniqIdDict[winAmountData[i].plId].playerID}!`);
                        // continue;
                    }
                    else {
                        let result = yield (0, apicalls_1.CallCreditWalletAPI)(this.PlayersUniqIdDict[winAmountData[i].plId].playerID, winAmountData[i].win.value, this.currentGameRoundId, !winAmountData[i].isDraw);
                        if (result != undefined && result != null) {
                            (0, LoggingHandler_1.LogMessage)(`Credited Amount : ${winAmountData[i].win.value} + Rake : ${result.rake}`, this, this.PlayersUniqIdDict[winAmountData[i].plId]);
                            console.log("Winning Amount Credited!");
                            winAmountData[i].win.subtract(new Money_1.Money(result.rake));
                            this.rake.add(new Money_1.Money(result.rake));
                        }
                        else {
                            (0, LoggingHandler_1.LogMessage)(`Credit Amount Failed`, this, this.PlayersUniqIdDict[winAmountData[i].plId]);
                            if (this.currentGameReport) {
                                this.currentGameReport.isEndedCleanly = false;
                            }
                            (0, logUtils_1.LogErrorToDB)({
                                functionName: "callUpdateCoinWallerAPI",
                                properties: { plId: winAmountData[i].plId },
                                servId: process.env.SERVERID,
                                time: new Date(),
                                errorCode: Utils_1.ErrorCode.MONEY_CREDITED_FAIL,
                                reason: "Winning Amount credit failed",
                            });
                        }
                    }
                }
                else {
                    console.log("Winning Player has also left the table");
                }
                returnWinData.push({
                    name: winAmountData[i].name,
                    plId: winAmountData[i].plId,
                    score: winAmountData[i].score,
                    win: winAmountData[i].win.value,
                    isDraw: winAmountData[i].isDraw
                });
            }
            return returnWinData;
        });
    }
    populateReason(gameEndReason, winAmountData, i, player, sortDependsOnScoreInDescendingOrder) {
        if (gameEndReason == Utils_1.GAMEENDCONDITION.ALLOPPONENTLEFT || gameEndReason == Utils_1.GAMEENDCONDITION.ALLLEFTBEFORESTART) {
            if (winAmountData[i].win.value > 0) {
                player.resultReason = `You won because all your opponents left the game`;
            }
            else {
                player.resultReason = `You lost because all you opponents left the game`;
            }
        }
        else {
            if (winAmountData[i].isDraw) {
                player.resultReason = `The game got tied. You neither lost or won the game.`;
            }
            else {
                let filter = sortDependsOnScoreInDescendingOrder.filter((x) => x.plId != winAmountData[i].plId);
                let maxScore = filter[0].score;
                if (winAmountData[i].win.value > 0) {
                    if (gameEndReason == Utils_1.GAMEENDCONDITION.ALLTOKENSIN)
                        player.resultReason = `You won because you moved all tokens to home before your opponent`;
                    else
                        player.resultReason = `You won because you scored ${winAmountData[i].score} points and your opponent scored ${maxScore} points`;
                }
                else {
                    if (gameEndReason == Utils_1.GAMEENDCONDITION.ALLTOKENSIN)
                        player.resultReason = `You lost the game because your opponent moved all tokens to home before you`;
                    else
                        player.resultReason = `You lost the game because you scored ${winAmountData[i].score} points and your opponent scored ${maxScore} points`;
                }
            }
        }
    }
    turnTimerLoop() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.currPlAtTurn && this.PlayersUniqIdDict[this.currPlAtTurn.plRoomNetId]) {
                this.turnTimer--;
            }
            else {
                this.turnTimer = 0;
            }
            let timerMsg = {
                t: Utils_1.MSGTYPE.TURNTIMER,
                data: this.turnTimer,
                currPlTurn: this.currPlAtTurn.plRoomNetId
            };
            this.sendMessageToAll(timerMsg);
            // console.log("Running TURN TIMER " + this.turnTimer)
            if (this.turnTimer == 0) {
                let playerSkippingTurn = this.currPlAtTurn.plRoomNetId;
                (0, LoggingHandler_1.LogMessage)(`Player ${playerSkippingTurn} skipped turn`, this, this.PlayersUniqIdDict[playerSkippingTurn]);
                if (this.currPlAtTurn != null && this.currPlAtTurn != undefined) {
                    this.currPlAtTurn.skippedTurns++;
                    this.currPlAtTurn.state = Player_1.PLAYERSTATE.WAITING;
                }
                //this.currPlAtTurn = 
                this.getNextPlayerForTurn();
                if (this.gameShouldEndNow && this.currPlAtTurn.plRoomNetId == this.getFirstPlayerId()) {
                    yield this.endLudoGame({}, Utils_1.GAMEENDCONDITION.TURNSKIPPED);
                }
                else {
                    let turnSkipMsg = {
                        t: Utils_1.MSGTYPE.TURNSKIPPED,
                        plId: playerSkippingTurn,
                        nextRoll: this.currPlAtTurn.plRoomNetId
                    };
                    this.sendMessageToAll(turnSkipMsg);
                    this.currPlAtTurn.state = Player_1.PLAYERSTATE.ROLLDICE;
                    this.turnTimer = this.turnTimeVal;
                    (0, timers_1.clearTimeout)(this.turnTimeout);
                    this.turnTimeout = setTimeout(this.turnTimerLoop.bind(this), 1000);
                    if (this.PlayersUniqIdDict[playerSkippingTurn] && this.PlayersUniqIdDict[playerSkippingTurn].skippedTurns >= 3) {
                        let plKillMsg = {
                            t: Utils_1.MSGTYPE.THREESKIPS,
                            plId: playerSkippingTurn,
                        };
                        this.PlayersUniqIdDict[playerSkippingTurn].sendMessage(plKillMsg);
                        if (this.PlayersUniqIdDict[playerSkippingTurn].isDisconnected) {
                            this.PlayersUniqIdDict[playerSkippingTurn].resultReason = `You lost because your internet got disconnected and you could not join back game in time.`;
                        }
                        this.removePlayerFromRoom(this.PlayersUniqIdDict[playerSkippingTurn], true, Utils_1.RemovePlayerEvent.TIMEOUT);
                    }
                }
            }
            else {
                this.turnTimeout = setTimeout(this.turnTimerLoop.bind(this), 1000);
            }
        });
    }
    waitTimerLoop() {
        this.waitTimer--;
        //   console.log("Running Wait Timer Loop ==== " + this.waitTimer)
        //   console.log("Running Wait Timer Loop ==== " + this.waitTimeout)
        let waitTimerMsg = {
            t: Utils_1.MSGTYPE.WAITTIMER,
            data: this.waitTimer,
        };
        this.sendMessageToAll(waitTimerMsg);
        if (this.waitTimer == 0) {
            if (this.currentPlayersCount >= this.minPlayers) {
                (0, timers_1.clearTimeout)(this.waitTimeout);
                this.gameInStartProcess = true;
                this.currentGameState = Utils_1.GAMESTATE.STARTING;
                console.log("########## Setting TimeOut for 3 seconds ##########");
                setTimeout(() => {
                    this.startTheGame();
                }, 3000);
            }
            else {
                this.waitTimer = this.waitTimerVal;
                this.waitTimeout = setTimeout(this.waitTimerLoop.bind(this), 1000);
            }
        }
        else {
            this.waitTimeout = setTimeout(this.waitTimerLoop.bind(this), 1000);
        }
    }
    getNextPlayerForTurn() {
        console.log("getting next player");
        let nextPlayer = null;
        let currPlId = this.currPlAtTurn != null ? this.currPlAtTurn.plRoomNetId : 0;
        while (nextPlayer == null || nextPlayer == undefined) {
            console.log("while loop 1");
            if (this.currentPlayersCount <= 1) {
                return null;
            }
            currPlId++;
            if (currPlId > 3) {
                currPlId = 0;
            }
            nextPlayer = this.PlayersUniqIdDict[currPlId];
        }
        this.currPlAtTurn = nextPlayer;
        if (!this.currPlAtTurn) {
            (0, logUtils_1.LogErrorToDB)({
                functionName: "getNextPlayerForTurn",
                reason: "Next player assigned as null or undefined",
                properties: { tableGameId: Utils_1.TableID, session: this.currentGameRoundId },
                time: new Date(),
                servId: process.env.SERVERID,
                errorCode: Utils_1.ErrorCode.NEXT_PLAYER_NULL
            });
        }
        if (this.currPlAtTurn)
            (0, LoggingHandler_1.LogMessage)("Turn Changed to " + this.currPlAtTurn.plRoomNetId + " with state " + Player_1.PLAYERSTATE[this.currPlAtTurn.state], this, this.currPlAtTurn);
        return currPlId;
    }
    getLudoState() {
        let ludoState = {};
        let ludoScore = { 0: 0, 1: 0, 2: 0, 3: 0 };
        for (let key of Object.keys(this.board.Tokens)) {
            let token = this.board.Tokens[key];
            if (this.PlayersUniqIdDict[token.tokenType] != null && this.PlayersUniqIdDict[token.tokenType] != undefined) {
                ludoState[token.tokenId] = token.currPlace.postionNum;
                ludoScore[token.tokenType] += token.score;
                this.PlayersUniqIdDict[token.tokenType].score = ludoScore[token.tokenType];
            }
            else {
                ludoScore[token.tokenType] = 0;
            }
        }
        return { state: ludoState, score: ludoScore };
    }
    // async callAutoRefill(plRoomId: number) {
    //     let result = await callAutoRefillAPI(this.PlayersUniqIdDict[plRoomId].playerID, this.tableGameId)
    //     console.log(result)
    //     this.PlayersUniqIdDict[plRoomId].balance = result.coinBalance
    //     this.sendMessageToAll({ t: "pBal", id: plRoomId, bal: result.coinBalance })
    // }
    getFirstPlayerId() {
        for (let i = 0; i < this.maxPlayers; i++)
            if (this.PlayersUniqIdDict[i])
                return i;
        return -1;
    }
}
exports.TableGameRoom = TableGameRoom;
//# sourceMappingURL=TableGameRoom.js.map