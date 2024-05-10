import { clearTimeout } from "timers";

import { LogEnd, LogMessage, TableLogInit } from "../LoggingHandler";
import { getEntryFee, resetTable, Table, TableTypesDict } from "../server";
import { LogErrorToDB, LogGameStates, LogGameStateToDB } from "./logUtils";
import { addTokenToPlace, Board } from "./LudoBoard";
import { Player, PLAYERSTATE } from "./Player";
import { Token, TokenType } from "./Token";
import {
    ErrorCode,
    GAMEENDCONDITION,
    GameEndReport,
    GamesappGameID,
    GAMESTATE,
    getRandomGameId,
    MSGTYPE,
    RemovePlayerEvent, ServerID,
    TableID,
    TableTypeId,
} from "./Utils";
import { Money } from "./Money";
import {
    CallCreditWalletAPI,
    CallDebitWalletAPI,
    CallDeleteWalletAPI,
    CallLockFundsAPI,
    CallRakeCreditAPI,
    // CallReserveServerAPI,
    CallUpdatePlayerStatus,
    DBCollectionNames,
    sendToAnalytics
} from "../apicalls";
import { GlobalPlayerState } from "./DataTypes";
import { convertToObject } from "typescript";


export class TableGameRoom {



    turnTimeVal = 8
    public turnTimer = this.turnTimeVal;

    waitTimerVal = 10
    public waitTimer = this.waitTimerVal;

    gameTimerVal = 8 * 60;

    public minPlayers: number = 2;
    public maxPlayers: number = 4;
    public currPlAtTurn!: Player;

    public PlayersUniqIdDict: { [id: string]: Player; } = {};

    public board: Board = new Board();
    gameShouldEndNow: boolean = false;
    currentGameRoundId: string = '';
    stopRestart: boolean = false;

    currentGameReport!: GameEndReport;

    currentGameState: GAMESTATE = GAMESTATE.MATCHMAKING;

    gameInStartProcess: boolean = false;



    tableTypeID!: string;
    entryFee: number = 0;
    potRatioArr: number[] = [];
    rake: Money = new Money(0);

    playersLeftDuringGameStart: Player[] = [];

    leftPlayersForClientSending: Player[] = [];
    hasReportSent: boolean = false;

    constructor(tableTypeId: number) {
        this.currentGameRoundId = getRandomGameId();
        this.setTableTypeProperties(tableTypeId);
        TableLogInit(this);
        LogMessage("Table Initialized", this);

        this.setIntervalForProcessHandleLeftQueue();

    }

    setTableTypeProperties(tableType: number) {
        this.tableTypeID = tableType.toString();
        this.entryFee = parseFloat(TableTypesDict[tableType].minEntryFee);
        this.potRatioArr = TableTypesDict[tableType].data.winningAmount;

        LogMessage(`Table Type Properties set ${this.tableTypeID} | ${this.entryFee}`, this);
    }


    currentPlayersCount: number = 0;
    isGameEnded: boolean = false;

    async addPlayerToRoom(pl: Player, playerBal: number) {


        console.log("Wait TIMER :" + this.waitTimerVal)
        //check if disconnected player is trying to join again
        const disconnectedPlId = this.checkIfPlayerDisconnected(pl.playerID);

        console.log("player attempting to join " + pl.playerID)

        if (disconnectedPlId == -1) //if player is not disconnected one
        {

            console.log("player not disconnected " + pl.playerID)

            //check if player is already in room
            for (let i = 0; i < this.maxPlayers; i++) {
                if (this.PlayersUniqIdDict[i] && this.PlayersUniqIdDict[i].playerID == pl.playerID) {
                    LogMessage(`Player ${pl.playerID} is already in room`, this);
                    LogMessage("Closing socket because player is already in room", this);

                    console.log("Closing socket because player is already in room " + pl.playerID)

                    if (pl && pl.plSocket && pl.plSocket.isConnectionAlive) {
                        pl.sendMessage({
                            t: MSGTYPE.ERROR,
                            data: `You are already in room`,
                            showMessage: true
                        });
                        try {
                            pl.plSocket?.end();
                        }
                        catch {
                            console.log("error in closing socket")
                        }
                    }

                    return;
                }
            }


            let servAddr = process.env.SERVERADDRESS ? process.env.SERVERADDRESS : "localhost:8080";

            CallUpdatePlayerStatus(parseInt(pl.playerID), GlobalPlayerState.IN_LUDO, servAddr, getEntryFee(), TableTypeId).then((r) => {
                if (r) {
                    console.log("Player Status Updated");
                } else {
                    console.log("Player Status Update Failed");
                }
            });


            console.log("checking if maximum players are there or game in start process " + pl.playerID + " count:" + this.currentPlayersCount + "gameInStart:" + this.gameInStartProcess)

            if (this.currentPlayersCount >= this.maxPlayers || this.gameInStartProcess) {

                LogMessage(`Kicking ${pl.playerID}, Reason : full or game started table`, this);
                console.log("Kicking, Reason : full or game started table " + pl.playerID)


                LogErrorToDB({
                    functionName: "addPlayerToRoom",
                    reason: "Unable to join full or game started table",
                    properties: { playerID: pl.playerID, cTID: TableID },
                    time: new Date(),
                    servId: process.env.SERVERID,
                    errorCode: ErrorCode.FULL_TABLE
                });

                CallUpdatePlayerStatus(parseInt(pl.playerID), GlobalPlayerState.IN_APP, "", -1, -1);

                console.log("sending pl the unable to join msg " + pl.playerID)

                if (pl && pl.plSocket && pl.plSocket.isConnectionAlive) {

                    pl.sendMessage({ t: MSGTYPE.ERROR, data: `Unable to join table, Error Code : ${ErrorCode.FULL_TABLE}`, code: ErrorCode.FULL_TABLE });
                    pl.plSocket?.end();
                }

                try {
                    pl.plSocket?.end();
                }
                catch (e) {
                    //log in error stream
                    console.log(e)
                    console.log("Error while closing socket")
                }
                console.log("This table is already full cant join : " + ErrorCode.FULL_TABLE);

                return

            }

            this.currentPlayersCount++;
            console.log(" Before Locking Current Players Count : " + this.currentPlayersCount)

            //lock player funds and then let him join
            const lockFunds = await CallLockFundsAPI(pl.playerID, playerBal, Table.currentGameRoundId, true, pl.hasDeposited, undefined);

            if (!lockFunds.success) {
                console.log("Lock Funds Failed")
                LogMessage("Lock Funds Failed", Table, pl);

                this.currentPlayersCount--;

                CallUpdatePlayerStatus(parseInt(pl.playerID), GlobalPlayerState.IN_APP, "", -1, -1);
                console.log("Closing socket because lock funds failed");

                if (pl && pl.plSocket && pl.plSocket.isConnectionAlive) {
                    pl.sendMessage({
                        t: MSGTYPE.ERROR,
                        data: `Unable to join table,\n ${lockFunds.data}`,
                    });
                    try {
                        pl.plSocket?.end();
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
            LogMessage(`Player ${pl.playerID} reconnected`, this);

            this.handleRejoinPlayer(player, playerBal);

            return;
        }




        for (let i = 0; i < this.maxPlayers; i++) {
            if (this.PlayersUniqIdDict[i] != null) {
                if (this.PlayersUniqIdDict[i].playerID == pl.playerID) {
                    console.log("This player is already joined")
                    LogMessage(`Player with ${pl.playerID} is already joined!`, this);
                    this.currentPlayersCount--;
                    return;
                }
            }
        }






        if ((!pl) || (!pl.plSocket) || (!pl.plSocket.isConnectionAlive)) {

            if (!pl)
                LogMessage(`Kicking Player, Reason : player is null`, this);
            else if (!pl.plSocket)
                LogMessage(`Kicking ${pl.playerID}, Reason : player socket is null`, this);
            else if (!pl.plSocket.isConnectionAlive)
                LogMessage(`Kicking ${pl.playerID}, Reason : socket not alive`, this);




            // CallLeftPlayerAPI(this.tableGameId, pl.playerID, RemovePlayerEvent.ERRORED);
            //Calling UnLockFundsAPI to unlock the funds of player as It is locked while createNewPlayerFunction in server.ts
            await CallLockFundsAPI(pl.playerID, this.entryFee, this.currentGameRoundId, false, pl.hasDeposited, "Errored while joining table");
            CallUpdatePlayerStatus(parseInt(pl.playerID), GlobalPlayerState.IN_APP, "", -1, -1);

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


        clearTimeout(this.deleteTableTimeout)

        this.waitTimer = this.waitTimerVal;

        //if current players equal minimum players then start 15 second countdown to start the game.
        console.log("Current Players Count : " + this.currentPlayersCount)
        if (this.currentPlayersCount >= 1) {

            console.log("################# Restarting Wait Timer  Curr Pls:" + this.currentPlayersCount + "###################")
            if (!this.gameInStartProcess) {
                //above check added as the timer was getting started twice in case of player's lock funds success coming at the moment 3,2,1 was started already

                clearTimeout(this.waitTimeout)
                //TLDR this should not get started twice in case of player leaves and joins
                this.waitTimeout = setTimeout(this.waitTimerLoop.bind(this), 1000)
            }
        }

        console.log("Adding Pl to room =======")


        LogMessage(`Adding player ${pl.playerID} to room`, this);

        //  console.log(pl.plSocket)

    }

    checkIfPlayerDisconnected(playerID: string): number // -1 if not found
    {
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

    handleRejoinPlayer(player: Player, playerBal: number) {
        player.gRoom = this;
        player.balance = new Money(playerBal);

        let leftPlAr = []

        for (let i = 0; i < this.leftPlayersForClientSending.length; i++) {
            leftPlAr.push({
                "plId": this.leftPlayersForClientSending[i].plRoomNetId,
                "pname": this.leftPlayersForClientSending[i].plName,
                "pImg": this.leftPlayersForClientSending[i].profileImage
            })
        }

        const rejoinMsg = {
            t: MSGTYPE.REJOINED,
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
            rollDice: player.state == PLAYERSTATE.SELECTTOKEN ? this.currDiceRollVal : undefined,
            movableTokens: player.state == PLAYERSTATE.SELECTTOKEN ? player.lastMovableTokens : undefined,
        }

        const playerRejoinMsg = {
            t: MSGTYPE.PL_REJOINED,
            plId: player.plRoomNetId,
            image: player.profileImage,
            name: player.plName,
            bal: player.balance.value,


        }

        player.sendMessage(rejoinMsg);

        this.sendMessageToOthers(playerRejoinMsg, player.plRoomNetId);
    }

    handleJoinPlayer(pl: Player, playerBal: number) {
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

        } else {


            for (let i = 0; i < this.maxPlayers; i++)
                if (this.PlayersUniqIdDict[i] == null) {
                    this.PlayersUniqIdDict[i] = pl;
                    pl.plRoomNetId = i;
                    //  pl.assignTokens();
                    break;
                }
        }

        pl.gRoom = this;
        pl.balance = new Money(playerBal)

        let playerAddedMsg = {
            t: MSGTYPE.PADD,
            plId: pl.plRoomNetId,
            pImage: pl.profileImage,
            pName: pl.plName,

            bal: pl.balance.value
        };
        let leftPlAr = []

        for (let i = 0; i < this.leftPlayersForClientSending.length; i++) {
            leftPlAr.push({
                "plId": this.leftPlayersForClientSending[i].plRoomNetId,
                "pname": this.leftPlayersForClientSending[i].plName,
                "pImg": this.leftPlayersForClientSending[i].profileImage
            })
        }

        //send message to player for succesful room joins
        //send his place on the map and initial game state.
        pl.sendMessage({
            t: MSGTYPE.JOINED,
            plId: pl.plRoomNetId,
            tID: this.currentGameRoundId,
            bal: pl.balance.value,
            snap: this.getRoomSnap(),
            leftPls: leftPlAr,
        });

        //send to others that player has joined
        this.sendMessageToOthers(playerAddedMsg, pl.plRoomNetId)


    }

    roundToTwoDigits(amount: number) {
        return Math.trunc((amount * 100)) / 100;
    }

    async startTheGame() {
        console.log("############  Starting the game   #############")
        // let result = await callTableGameStartingAPI(this.gameId, this.tableGameId)

        // if (result) {
        // this.closeTable("Starting Table Game Failed", "Table Game Starting API Failed", true);
        // return;
        // } else
        // {
        //   this.gameInStartProcess = true;
        LogMessage(`Starting Game....`, this,);

        this.currentGameState = GAMESTATE.STARTED;
        const playerIds: string[] = [];

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

        LogMessage(`New Session Id Generated : ${this.currentGameRoundId}`, this);

        this.currentGameReport = {
            tableId: TableID + "",
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

        LogMessage(JSON.stringify(this.currentGameReport), this);

        LogGameStateToDB(LogGameStates.GAME_STARTED, this); //Log To DB
        // }
        console.log("################# Deductions Started ###################");

        // TLDR Player should not be able to run back 
        let potAmt: Money = new Money(0);
        for (let i = 0; i < this.maxPlayers; i++) {
            if (this.PlayersUniqIdDict[i]) {
                // let waitCallUpdate = await callUpdateCoinWalletAPI(this.PlayersUniqIdDict[i].playerID, GamesappGameID, this.tableGameId, (-1 * entryFee).toString(), "PLAYER_BET", true, "Ludo test BET", this.currentGameSession);
                const player = this.PlayersUniqIdDict[i];
                LogMessage("Deducting Balance " + this.entryFee.toString(), this, player);
                console.log("################# Deducting Balance #########" + player.playerID + "##########");

                let deductApiResponse = await CallDebitWalletAPI(player.playerID, this.entryFee, this.currentGameRoundId);
                if (!deductApiResponse.status) {
                    LogMessage("Deducting balance failed..." + deductApiResponse.message, this, player);
                    console.log("################# Deducting balance FAILED #########" + player.playerID + "##########");

                    player.sendMessage({
                        t: MSGTYPE.ERROR,
                        msg: "Deducting balance failed! Kicking Player..." + deductApiResponse.message
                    });

                    this.removePlayerFromRoom(player, true, RemovePlayerEvent.ERRORED);
                    continue;
                }

                this.currentGameReport.entryFees[player.playerID] = this.entryFee;
                console.log("################# Deducting Success #########" + player.playerID + "##########");

                LogMessage(`Deduction Success : ${JSON.stringify(deductApiResponse)}`, this, player);

                player.hasDeposited = true;
                potAmt.add(new Money(this.entryFee));

                this.currentGameReport.players.push(player.playerID);

                LogMessage("Added to report list", this, player);
            }
        }

        //Moved pot distribution code up to handle case of all players left before start. Otherwise pot distribution was not getting calculated

        this.potDistribution = [
            // this.roundToTwoDigits(potAmt * this.potRatioArr[0] / 100),
            Money.Multiply(potAmt, (this.potRatioArr[0] / 100)).value,
            Money.Multiply(potAmt, (this.potRatioArr[1] / 100)).value,
            Money.Multiply(potAmt, (this.potRatioArr[2] / 100)).value,
            Money.Multiply(potAmt, (this.potRatioArr[3] / 100)).value
        ];

        this.potDistribution[3] = potAmt.value - this.potDistribution[0] - this.potDistribution[1] - this.potDistribution[2];

        LogMessage("Pot Distribution : " + this.potDistribution, this);
        console.log(this.potDistribution);

        //playersLeftDuringGameStart in this list the lowest player has left at the end


        if (this.playersLeftDuringGameStart.length == this.currentPlayersCount) {

            //show player Ids of players who left
            let plIdsLeftsLog = ""
            for (let i = 0; i < this.playersLeftDuringGameStart.length; i++) {
                plIdsLeftsLog += this.playersLeftDuringGameStart[i].playerID + ","
            }

            console.log("################# Players Left Before Start: " + plIdsLeftsLog + " ###################");

            let playersWhoDeposited = []
            //everyone left
            // we need to filter the players who have actually deposited the money
            for (let i = 0; i < this.playersLeftDuringGameStart.length; i++) {
                let playerId = this.playersLeftDuringGameStart[i].playerID
                if (this.currentGameReport.entryFees[playerId]) {

                    playersWhoDeposited.push(this.playersLeftDuringGameStart[i])
                } else {
                    console.log("################# handlePlayerLeftProcess No Deposit: " + this.playersLeftDuringGameStart[i].playerID + " ###################");

                    await this.handlePlayerLeftProcess(this.playersLeftDuringGameStart[i], true, RemovePlayerEvent.LEFT_DURING_START, true);

                }
            }
            let plIdsDepositedLog = ""
            for (let i = 0; i < playersWhoDeposited.length; i++) {
                plIdsDepositedLog += playersWhoDeposited[i].playerID + ","
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
            this.endLudoGame(null, GAMEENDCONDITION.ALLLEFTBEFORESTART);
            return;
        }
        else {
            //one player is there others have left or more than 1 player is there
            //just kick the left players  the pending player will bve declared winner in startLudo function
            for (let i = 0; i < this.playersLeftDuringGameStart.length; i++) {

                if (this.playersLeftDuringGameStart[i]) {
                    LogMessage(`Player Left During Game Start : ${this.playersLeftDuringGameStart[i].playerID}, Kicking Now`, this, this.playersLeftDuringGameStart[i]);
                    this.handlePlayerLeftProcess(this.playersLeftDuringGameStart[i], true, RemovePlayerEvent.LEFT, true);

                }
            }

        }


        LogGameStateToDB(LogGameStates.MONEY_DEDUCTED, this);


        if (this.currentPlayersCount == 0) {
            console.log("################# No Players Left ###################");

            // Sending game round report because no players are left before game started as Their was some error in deducting balance
            // Usually if game round report is not sent then game stucks in starting state on load balancer
            this.sendGameRoundReport("No Players Left");


        } else {
            console.log("################# StartLudo Function ###################");

            this.startLudo(this.potDistribution);

        }

        // if (result) {

        //     this.startLudo(this.potDistribution);

        // } else {
        //     console.log("Deleting the game room as API failed")
        //     this.closeTable(undefined, "Removing the game because API Failed", true);
        // }
    }

    sendGameRoundReport(reason: string) {
        //if is game started on lb is true then game round report is already sent
        // if(this.isGameStartedOnLB)
        //     this.isGameStartedOnLB = false;

        if (this.hasReportSent) {
            LogMessage("Game Round Report Already Sent", this);
            return;
        }

        LogMessage("Sending Game Round Report, reason=" + reason, this);

        this.currentGameReport.endTime = new Date();
        this.currentGameReport.isEndedCleanly = true;

        LogMessage(JSON.stringify(this.currentGameReport), this);

        this.hasReportSent = true;
        sendToAnalytics({
            collection: DBCollectionNames.GAME_ROUND_REPORTS,
            data: {
                report: this.currentGameReport,
                time: new Date(),
                serverId: process.env.SERVERID,
                gameRoundId: this.currentGameRoundId,
            }
        });
        // CallGameRoundReportAPI(this.tableGameId, this.currentGameRoundId, undefined, true, this.currentGameReport);
    }

    handleLeaveBtnClick(pl: Player) {
        LogMessage("Player Left", this, pl);
        this.removePlayerFromRoom(pl, true, RemovePlayerEvent.LEFT);
    }



    removePlayerFromRoom(pl: Player, closeSocket: boolean, removeEvent: RemovePlayerEvent = RemovePlayerEvent.DISCONNECTED, unlockFunds: boolean = true) {

        if (!pl.updateRemovalEvent(removeEvent)) {
            console.log("Player " + pl.playerID + "  has state " + pl.removalEvent + " could not be updated to " + RemovePlayerEvent[removeEvent])
            return;
        }

        if (!this.PlayersUniqIdDict[pl.plRoomNetId]) {

            console.log("Player " + pl.plRoomNetId + " not in room")

            return;
        }
        else if (removeEvent == RemovePlayerEvent.DISCONNECTED && this.PlayersUniqIdDict[pl.plRoomNetId].isDisconnected) {
            LogMessage("Player already disconnected", this, pl);
            return;
        }


        //player in the wait timer 0 -10
        if (!this.gameInStartProcess) {

            removeEvent = RemovePlayerEvent.PRELEFT;

            this.waitTimer = this.waitTimerVal;
            clearTimeout(this.waitTimeout)
            console.log("################# Restarting Wait Timer ###################")
            this.waitTimeout = setTimeout(this.waitTimerLoop.bind(this), 1000)
        }
        //player in the gameinstartprocess 10+1.10+2,10+3 also deduction apis getting called
        else if (this.gameInStartProcess && !this.gameStarted) {
            removeEvent = RemovePlayerEvent.LEFT_DURING_START;
        }
        else if (this.gameStarted && removeEvent == RemovePlayerEvent.LEFT) {
            // removeEvent = RemovePlayerEvent.LEFT;

        } else if (this.isGameEnded && removeEvent == RemovePlayerEvent.DISCONNECTED) {
            removeEvent = RemovePlayerEvent.LEFT;
        }


        //Adding to Game Report
        if (this.currentGameReport && this.currentGameState !== GAMESTATE.ENDED && removeEvent !== RemovePlayerEvent.DISCONNECTED) {
            this.currentGameReport.leftPlayers[pl.playerID] = RemovePlayerEvent[removeEvent];
        }




        if (this.currentGameRoundId != '') {
            LogMessage(`Player Removed because of ${RemovePlayerEvent[removeEvent]} event`, this, pl);
        }


        LogMessage(`Player ${pl.playerID} removed because of ${RemovePlayerEvent[removeEvent]} event`, this);


        LogMessage(`Removing playerEvent : ${RemovePlayerEvent[removeEvent]} `, this, pl);


        if (removeEvent == RemovePlayerEvent.DISCONNECTED) {
            this.PlayersUniqIdDict[pl.plRoomNetId].isDisconnected = true;
            this.sendMessageToAll({ t: MSGTYPE.PLEFT, data: pl.plRoomNetId, playerId: pl.playerID, reason: removeEvent });

        } else if (removeEvent == RemovePlayerEvent.LEFT_DURING_START) {

            //check if pl is already in the list
            let isAlreadyInList = false;
            for (let i = 0; i < this.playersLeftDuringGameStart.length; i++) {
                if (this.playersLeftDuringGameStart[i].playerID == pl.playerID) {
                    isAlreadyInList = true;
                    LogMessage(`Player ${pl.playerID} Already found in the leftDuringStartList, Count : ${this.playersLeftDuringGameStart.length}`, this, pl);

                    break;
                }
            }

            if (!isAlreadyInList) {
                this.playersLeftDuringGameStart.push(pl);
                LogMessage(`Added To Left During Game Start List, Count : ${this.playersLeftDuringGameStart.length}`, this, pl);
            }
        } else {
            this.handlePlayerLeftProcess(pl, closeSocket, removeEvent, unlockFunds);
        }



    }


    handlePlayerLeftProcess(pl: Player, closeSocket: boolean, removeEvent: RemovePlayerEvent, unlockFunds: boolean) {

        let request = {
            pl: pl,
            closeSocket: closeSocket,
            removeEvent: removeEvent,
            unlockFunds: unlockFunds
        }
        this.HandleLeftProcessQueue.push(request);



    }

    resultCalculationStarted: boolean = false;
    HandleLeftProcessQueue: any[] = []
    isInHandlingLeftQueueProcess: boolean = false;

    async processHandleLeftQueue() {

        if (this.resultCalculationStarted)
            return;

        this.isInHandlingLeftQueueProcess = true
        let flagGameShouldEndOnlyOnePlayerLeft = false;

        while (this.HandleLeftProcessQueue.length > 0) {

            if (this.resultCalculationStarted)
                break;

            let request = this.HandleLeftProcessQueue.shift();
            console.log("**handlePlayerLeftProcessExecute " + " length =(" + this.HandleLeftProcessQueue.length + ") pl = " + request.pl.playerID)

            await this.handlePlayerLeftProcessExecute(request.pl, request.closeSocket, request.removeEvent, request.unlockFunds);
            console.log("**handlePlayerLeftProcessExecute DONE " + " length =(" + this.HandleLeftProcessQueue.length + ") pl = " + request.pl.playerID)


            if (this.currentPlayersCount == 1 && this.gameStarted && !this.isGameEnded) {
                flagGameShouldEndOnlyOnePlayerLeft = true;
                break
            }

        }

        this.isInHandlingLeftQueueProcess = false

        if (flagGameShouldEndOnlyOnePlayerLeft) {
            await this.endLudoGame({}, GAMEENDCONDITION.ALLOPPONENTLEFT)
        }

    }


    setIntervalForProcessHandleLeftQueue() {
        setInterval(() => {
            if (this.HandleLeftProcessQueue.length > 0 && !this.isInHandlingLeftQueueProcess)
                this.processHandleLeftQueue();
        }, 1000);
    }

    async handlePlayerLeftProcessExecute(pl: Player, closeSocket: boolean, removeEvent: RemovePlayerEvent, unlockFunds: boolean) {


        console.log("handlePlayerLeftProcess " + pl.playerID)

        if (unlockFunds) {
            let gameEndReason = '';

            if(pl.resultReason != '') {
                gameEndReason = pl.resultReason;
            } else if (pl.hasDeposited)
                gameEndReason = (removeEvent == RemovePlayerEvent.TIMEOUT ? `You lost because you skipped three times.` : `You lost because you left the game midway.`);
            // let hasPlDeposited = this.currentGameReport ? this.currentGameReport.players.includes(pl.playerID) : false;
            await CallLockFundsAPI(pl.playerID, 0, Table.currentGameRoundId, false, pl.hasDeposited, gameEndReason);
        }
        CallUpdatePlayerStatus(parseInt(pl.playerID), GlobalPlayerState.IN_APP, "", -1, -1);



        for (let key of Object.keys(this.board.Tokens)) {
            let token = this.board.Tokens[key];

            if (token.tokenType == pl.plRoomNetId) {
                this.board.Tokens[key].score = 0;
                addTokenToPlace(this.board.Tokens[key], this.board.Tokens[key].startPos.postionNum, this.board)
                this.board.Tokens[key].score = 0;

            }
        }


        if (this.gameInStartProcess)
            this.leftPlayersForClientSending.push(pl);


        delete this.PlayersUniqIdDict[pl.plRoomNetId];
        this.sendMessageToAll({ t: MSGTYPE.PLEFT, data: pl.plRoomNetId, reason: removeEvent });


        if (pl.plRoomNetId != -1)
            this.currentPlayersCount--;

        console.log("After pl left " + pl.playerID + " currentPlayersCount", this.currentPlayersCount);

        if (closeSocket && pl.plSocket.isConnectionAlive) {
            console.log("Closing socket in handle player left process");
            try {
                pl.plSocket?.end();
            }
            catch (e) {
                console.log(e);
            }
        }


        // if (this.currentPlayersCount == 1 && this.gameStarted && !this.isGameEnded) {
        //     await this.endLudoGame({}, GAMEENDCONDITION.ALLOPPONENTLEFT)
        // }


    }







    cleanUpTable(reason: string, isErrored: boolean, needToSendGameRoundReport: boolean) {

        // this.currentGameState = GAMESTATE.RESTARTING;
        console.log("cleanUpTable")
        LogMessage(`CleaningUp Table, reason=${reason}`, this);

        clearTimeout(this.turnTimeout)
        clearTimeout(this.gamePlayTimeout)
        clearTimeout(this.waitTimeout)

        console.log("closing callEndGameAlertAPI")


        // Ending Log File
        // LogEnd(this);

        CallDeleteWalletAPI(this.currentGameRoundId).then((result) => {
            console.log("CallDeleteWalletAPI")
            console.log(result);

            if (result) {
                console.log("############# Ending the game server #############")
                resetTable();
            }
        })

            ;



        LogEnd(this);
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

    sendMessageToOthers(content: any, plRoomNetId: number) {
        for (let i = 0; i < this.maxPlayers; i++)
            if (this.PlayersUniqIdDict[i] != null && i != plRoomNetId && this.PlayersUniqIdDict[i]) {
                this.PlayersUniqIdDict[i].sendMessage(content);
            }
    }

    sendMessageToAll(content: any) {
        for (let i = 0; i < this.maxPlayers; i++)
            if (this.PlayersUniqIdDict[i] != null)
                this.PlayersUniqIdDict[i].sendMessage(content);

    }

    getRoomSnap(withRoomId: boolean = true) {

        // other players with colors , names and profile pic urls
        let snap = []

        for (let i = 0; i < this.maxPlayers; i++) {
            if (this.PlayersUniqIdDict[i] != null && this.PlayersUniqIdDict[i]) {

                let msg: any = { pName: this.PlayersUniqIdDict[i].plName, pImage: this.PlayersUniqIdDict[i].profileImage, pDefaultId: this.PlayersUniqIdDict[i].playerID }
                if (withRoomId) {
                    msg.plId = i;
                }
                snap.push(msg)
            }
        }
        return snap
    }

    getStats(): { [index: number]: { score: number, health: number } } {
        let stats: {
            [index: number]: {
                score: number,
                health: number
            }
        } = {};

        for (let i = 0; i < this.maxPlayers; i++) {
            if (this.PlayersUniqIdDict[i] != null && this.PlayersUniqIdDict[i]) {
                stats[this.PlayersUniqIdDict[i].plRoomNetId] = {
                    score: this.PlayersUniqIdDict[i].score,
                    health: 3 - this.PlayersUniqIdDict[i].skippedTurns
                }
            }
        }

        return stats;
    }

    gamePlayTimeout!: NodeJS.Timeout
    turnTimeout!: NodeJS.Timeout;
    waitTimeout!: NodeJS.Timeout;
    deleteTableTimeout!: NodeJS.Timeout;
    gamePlayTimer: number = this.gameTimerVal;
    gameStarted: boolean = false;


    startLudo(potDist: number[]) {
        LogMessage("Starting Ludo Game", this);

        this.currentGameState = GAMESTATE.IN_GAME;

        //check again before starting
        if (this.currentPlayersCount == 1) {
            this.endLudoGame({}, GAMEENDCONDITION.ALLOPPONENTLEFT)
        } else if (this.currentPlayersCount > 1) {

            LogMessage("Timer Left : " + this.gamePlayTimer, this);

            this.isGameEnded = false;
            this.gameStarted = true;

            this.currPlAtTurn = this.PlayersUniqIdDict[this.getFirstPlayerId()];
            this.currPlAtTurn.state = PLAYERSTATE.ROLLDICE;
            let gameStartMsg: any = {
                t: MSGTYPE.GAMESTART,
                snap: this.getRoomSnap(true),
                turn: this.currPlAtTurn.plRoomNetId,
                pot: potDist,
                gameRoundId: this.currentGameRoundId
            }
            for (let i = 0; i < this.maxPlayers; i++)
                if (this.PlayersUniqIdDict[i] != null) {
                    gameStartMsg.plId = i;
                    this.PlayersUniqIdDict[i].sendMessage(gameStartMsg);
                }

            //   console.log(gameStartMsg)
            clearTimeout(this.gamePlayTimeout)
            clearTimeout(this.turnTimeout)
            this.gamePlayTimer = this.gameTimerVal;
            this.gamePlayTimeout = setTimeout(this.gamePlayLoop.bind(this), 1000)
            this.turnTimeout = setTimeout(this.turnTimerLoop.bind(this), 1000)
        }
    }

    async handleSwitchTable(pl: Player) {

        if (this.stopRestart || this.gameInStartProcess) {
            console.log("Restarting in progress");

            pl.sendMessage({
                t: "switchFailed"
            });

            return;
        }


        pl.sendMessage({
            t: MSGTYPE.SWITCH_SUCCESS,
            id: ServerID
        });

        this.removePlayerFromRoom(pl, false, RemovePlayerEvent.SWITCHED);
        console.log("Switching Table");

    }



    handleDiceRoll(pl: Player) {

        LogMessage("Player " + pl.plRoomNetId + " rolled dice with state : " + PLAYERSTATE[pl.state], this, pl);
        if (this.isGameEnded)
            return

        //check player exists
        if (pl.state == PLAYERSTATE.ROLLDICE) {
            pl.state = PLAYERSTATE.ROLLED;
            clearTimeout(this.turnTimeout);

            // create a random number
            let randDiceRoll = Math.floor(Math.random() * 6) + 1
            this.currDiceRollVal = randDiceRoll;


            let diceRollNotif = {
                t: "diceRollNotif",
                plId: pl.plRoomNetId
            }


            this.sendMessageToAll(diceRollNotif)

            LogMessage("Dice Roll : " + randDiceRoll, this, pl);
            if (randDiceRoll == 6) {

                if (pl.sixRollStreak == 2) {
                    //             console.log("You rolled six thrice cancelling last run");
                    pl.state = PLAYERSTATE.WAITING;
                    pl.sixRollStreak = 0

                    // send to next player now
                    let playerThrowingThreeSix = this.currPlAtTurn.plRoomNetId
                    //this.currPlAtTurn =    this.PlayersUniqIdDict[
                    this.getNextPlayerForTurn()
                    //]

                    if (this.gameShouldEndNow && this.currPlAtTurn.plRoomNetId == this.getFirstPlayerId()) {

                        this.endLudoGame({}, GAMEENDCONDITION.THREESIX)
                    } else {

                        let threeSixMsg = {
                            t: MSGTYPE.THREESIX,
                            plId: playerThrowingThreeSix,
                            nextRoll: this.currPlAtTurn.plRoomNetId
                        }
                        this.currPlAtTurn.state = PLAYERSTATE.ROLLDICE;


                        setTimeout(() => {
                            this.sendMessageToAll(threeSixMsg)
                        }, 800)

                        setTimeout(() => {

                            this.sendMessageToAll({
                                t: MSGTYPE.NEXTTURN,
                                nextRoll: this.currPlAtTurn.plRoomNetId
                            });
                            this.turnTimer = this.turnTimeVal;
                            this.turnTimeout = setTimeout(this.turnTimerLoop.bind(this), 1000)
                        }, 2000);
                    }

                    return;
                }
                //   currentPlayerRepeat = true;
                //   pl.sixRollStreak++
                //     pl.state = PLAYERSTATE.ROLLDICE
            } else {
                pl.sixRollStreak = 0
            }


            let movabaleTokens = []
            for (let key of Object.keys(this.board.Tokens)) {
                let token = this.board.Tokens[key];
                if (token.tokenType == pl.plRoomNetId) {
                    if (token.currPlace.isHomePoint || token.currPlace.CarpetType != TokenType.NONE) {
                        let reqdDiceNum = token.homePosNum - token.currPlace.postionNum
                        if (randDiceRoll <= reqdDiceNum)
                            movabaleTokens.push(token.tokenId)
                    } else {
                        movabaleTokens.push(token.tokenId)
                    }
                }
            }

            pl.lastMovableTokens = [...movabaleTokens];

            //   if (this.gameShouldEndNow && this.currPlAtTurn.plRoomNetId == 0) {

            //    this.endLudoGame({}, GAMEENDCONDITION.THREESIX)


            if (movabaleTokens.length == 0) {
                this.getNextPlayerForTurn()

                if (this.gameShouldEndNow && this.currPlAtTurn.plRoomNetId == this.getFirstPlayerId()) {
                    this.endLudoGame({}, GAMEENDCONDITION.NOVALIDMODE)

                } else {

                    let diceRollMsg = {
                        t: MSGTYPE.DICEROLLRES,
                        plId: pl.plRoomNetId,
                        dice: randDiceRoll,
                        movable: movabaleTokens,
                        nextroll: this.currPlAtTurn.plRoomNetId,
                    }


                    this.currPlAtTurn.state = PLAYERSTATE.ROLLDICE;
                    this.turnTimer = this.turnTimeVal;
                    this.turnTimeout = setTimeout(this.turnTimerLoop.bind(this), 1000)
                    setTimeout(() => {
                        this.sendMessageToAll(diceRollMsg);
                    }, 800)

                }
            }
            else {

                let diceRollMsg = {
                    t: MSGTYPE.DICEROLLRES,
                    plId: pl.plRoomNetId,
                    dice: randDiceRoll,
                    movable: movabaleTokens
                }

                setTimeout(() => {
                    this.sendMessageToAll(diceRollMsg);

                    this.turnTimer = this.turnTimeVal;
                    this.turnTimeout = setTimeout(this.turnTimerLoop.bind(this), 1000)

                    pl.state = PLAYERSTATE.SELECTTOKEN
                }, 800)


            }

        }
        else {
            console.log("It is not player " + pl.plRoomNetId + "'s turn")
        }
        //send back to player
    }

    currDiceRollVal: number | null = null

    handleTokenMove(player: Player, tokenNum: string) {

        if (player.plRoomNetId != this.currPlAtTurn.plRoomNetId) {
            console.log("It is not this player's turn!")
            return;
        }

        //check player exists
        if (this.isGameEnded) {
            console.log("this game is ended already")
            return
        }

        if (this.board.Tokens[tokenNum].currPlace.CarpetType != TokenType.NONE) {
            let reqdDiceNum = this.board.Tokens[tokenNum].homePosNum - this.board.Tokens[tokenNum].currPlace.postionNum

            if (this.currDiceRollVal != null && this.currDiceRollVal > reqdDiceNum) {

                let invalidMoveMsg = {
                    t: MSGTYPE.INVALIDMOVE
                }
                player.sendMessage(invalidMoveMsg)
                console.log("this is an invalid move")

                return;
            }
        }

        //check if it is player's turn
        if (player.state == PLAYERSTATE.SELECTTOKEN) {
            clearTimeout(this.turnTimeout);

            if (this.currDiceRollVal != null && this.board.Tokens[tokenNum] != null) {
                //    console.log("moving token on board")

                this.moveTokenOnBoard(player, this.board.Tokens[tokenNum], this.currDiceRollVal);

            } else {
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
    moveTokenOnBoard(pl: Player, tokenToMove: Token, diceRun: number) {
        // move token on board

        let currentPlayerRepeat: boolean = false;
        pl.state = PLAYERSTATE.WAITING

        let tokenMovePositions: number[] = []

        if (diceRun == 6) {


            currentPlayerRepeat = true;
            pl.sixRollStreak++
            pl.state = PLAYERSTATE.ROLLDICE
        }



        let moveTokensData = []

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
                addTokenToPlace(tokenToMove, finalPosition.postionNum, this.board)
            }
            else if (finalPosition.isHomePoint) {
                addTokenToPlace(tokenToMove, finalPosition.postionNum, this.board)
                tokenToMove.score += 56

                currentPlayerRepeat = true;
            }
            else {

                if (finalPosition.currToken.length == 1) {

                    if (finalPosition.currToken[0].tokenType != tokenToMove.tokenType) {
                        // here the token is enemy token we need to cut it here
                        // send enemy token back!
                        let tokenCut = finalPosition.currToken[0]
                        tokenCut.score = 0
                        addTokenToPlace(finalPosition.currToken[0], finalPosition.currToken[0].startPos.postionNum, this.board)

                        moveTokensData.push({ tokenId: tokenCut.tokenId, pos: [tokenCut.currPlace.postionNum], isCut: true })

                        // give me extra roll
                        pl.state = PLAYERSTATE.ROLLDICE
                        currentPlayerRepeat = true;

                    }
                }
                // place my token here
                addTokenToPlace(tokenToMove, finalPosition.postionNum, this.board)
            }

        }

        //  console.log("TOKEN MOVE POS " + JSON.stringify(tokenMovePositions))

        moveTokensData.push({ tokenId: tokenToMove.tokenId, pos: tokenMovePositions, isCut: false })

        tokenToMove.score += diceRun;
        let moveTokenMsg: any = {}

        let nextPlayerTurn = currentPlayerRepeat ? this.currPlAtTurn.plRoomNetId : this.getNextPlayerForTurn()
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

            this.endLudoGame({}, GAMEENDCONDITION.ALLTOKENSIN)
        }

        else if (this.gameShouldEndNow && nextPlayerTurn == this.getFirstPlayerId() && !currentPlayerRepeat) {
            LogMessage(`gameShouldEndNow ${this.gameShouldEndNow}, nextPlayerTurn ${nextPlayerTurn == this.getFirstPlayerId()}, currentPlayerRepeat ${!currentPlayerRepeat}`, this);
            this.endLudoGame(moveTokensData, GAMEENDCONDITION.MOVTOKEN)

        } else {
            moveTokenMsg = {
                t: MSGTYPE.MOVTOKEN,
                data: moveTokensData,
                nextroll: nextPlayerTurn,
                gState: this.getLudoState()
            }

            this.currPlAtTurn = this.PlayersUniqIdDict[moveTokenMsg.nextroll]
            this.currPlAtTurn.state = PLAYERSTATE.ROLLDICE;
            this.turnTimer = this.turnTimeVal;
            this.turnTimeout = setTimeout(this.turnTimerLoop.bind(this), 1000)
            this.sendMessageToAll(moveTokenMsg);

            //   console.log(moveTokenMsg)

        }


    }

    gamePlayLoop() {

        this.gamePlayTimer--;

        let timerMsg = {
            t: MSGTYPE.TIMER,
            data: this.gamePlayTimer

        }
        this.sendMessageToAll(timerMsg)

        if (this.gamePlayTimer == 0) {
            // here end the game forcefully and declare winner

            this.gameShouldEndNow = true;

            //    console.log("THE GAME TIMER ==0")
            console.log("Stopping the game")

        } else {
            this.gamePlayTimeout = setTimeout(this.gamePlayLoop.bind(this), 1000)
        }


        if (this.gamePlayTimer < 0) {
            sendToAnalytics({
                collection: DBCollectionNames.UnexpectedErrors,
                data: {
                    msg: "Game timer is less than 0",
                    tableId: TableID,
                    gameRoundId: this.currentGameRoundId,
                    gamePlayTimer: this.gamePlayTimer,
                    time: new Date(),
                }
            })
        }

    }


    async endLudoGame(moveTokensData: any, msg: GAMEENDCONDITION) {

        this.resultCalculationStarted = true

        //await for isInHandlingLeftQueueProcess to be false
        while (this.isInHandlingLeftQueueProcess) {
            //await for 1 s
            await new Promise(resolve => setTimeout(resolve, 1000));
        }





        // if (this.isGameEnded) {
        //     LogMessage("Returning as game is already ended.... " + msg, this);
        //     return;
        // }


        //stop turn timer
        if (this.turnTimeout) {
            LogMessage("Clearing turn timeout", this);
            clearTimeout(this.turnTimeout);
        }
        console.log("Cleared turn timeout");
        this.isGameEnded = true            //give extra turns as needed
        LogMessage("Ending Game.... " + msg, this);
        this.currentGameState = GAMESTATE.RESULT;
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



        let playersIncludedInResult: Player[] = []
        for (let i = 0; i < this.maxPlayers; i++) {
            if (this.PlayersUniqIdDict[i] && this.PlayersUniqIdDict[i] != undefined) {

                playersIncludedInResult.push(this.PlayersUniqIdDict[i])
            }
        }

        this.bubbleSort(playersIncludedInResult, playersIncludedInResult.length)

        let winAmountData: {
            name: string,
            plId: number,
            score: number,
            win: Money,
            isDraw: boolean
        }[] = []

        //check for ties
        // implement so top player share top 
        let positions: { [id: number]: Player[]; } = {};
        positions[0] = []
        positions[1] = []
        positions[2] = []
        positions[3] = []
        let nextPositionToFill: number = 0;

        for (let j = 0; j < playersIncludedInResult.length; j++) {
            let nextpl = playersIncludedInResult[j]
            for (let i: number = 0; i < 4; i++) {

                if (positions[i] == null) {
                    console.log("position " + i + " is null")
                    continue;
                }
                else {

                    // @ts-ignore
                    if (i >= nextPositionToFill && positions[i].length == 0) {
                        console.log("position " + i + " is is empty adding here ")
                        // @ts-ignore
                        positions[i].push(nextpl)
                        nextPositionToFill++
                        break;
                    }
                    // @ts-ignore
                    else if (positions[i].length > 0 && positions[i][0].score == nextpl.score) {
                        console.log("position " + i + " is filled with same score ")
                        // @ts-ignore
                        positions[i].push(nextpl)
                        nextPositionToFill++
                        break;

                    }
                }
            }
        }

        LogGameStateToDB(LogGameStates.RESULT_CALCULATED, this);

        LogMessage("Result Calcualted", this);
        for (let i = 0; i < 4; i++) {
            let potAmt: Money = new Money(0);

            if (positions[i].length <= 0)
                continue;

            let isDraw = false;
            let numberOfPlsDeposited = Object.keys(this.currentGameReport.entryFees).length;
            if (playersIncludedInResult.length == positions[i].length && numberOfPlsDeposited == playersIncludedInResult.length) {
                //if all players have same score then split the pot equally then it is a tie and we don't need to cut rake
                //if we cut rake in this situation then amounts will be in negative in result screen
                isDraw = true;
            }


            let plsInResultForLog = []
            for (let j = 0; j < playersIncludedInResult.length; j++) {
                plsInResultForLog.push(playersIncludedInResult[j].playerID)
            }

            LogMessage("playersIncludedInResult" + JSON.stringify(plsInResultForLog), this);

            for (let j = 0; j < positions[i].length; j++) {
                potAmt.add(new Money(this.potDistribution[i + j]));// += this.potDistribution[i + j]

            }
            LogMessage("potAmt " + potAmt.value + "positions[i].length " + positions[i].length, this);
            console.log("potAmt " + potAmt.value + " positions[i].length " + positions[i].length);
            let potShare = potAmt.divideIntoPart(positions[i].length);//new Money(potAmt / positions[i].length);

            LogMessage("potShare -  " + potShare.value, this);
            console.log("potShare -  " + potShare.value);

            for (let j = 0; j < positions[i].length; j++) {
                if (potAmt.isLt(potShare)) {
                    potShare = potAmt.copy();
                }

                potAmt.subtract(potShare);

                if (j == positions[i].length - 1 && potAmt.isGt(Money.Zero)) {
                    potShare.add(potAmt);
                }

                console.log("potShare " + potShare.value);
                LogMessage("potShare -  " + potShare.value, this);

                positions[i][j].winAmount = potShare.copy();
                LogMessage("positions[i][j].winAmount -  " + positions[i][j].winAmount.value, this);
                winAmountData.push({ name: positions[i][j].plName, plId: positions[i][j].plRoomNetId, score: positions[i][j].score, win: positions[i][j].winAmount, isDraw: isDraw });
            }
        }



        // for (let i = 0; i < winData.length; i++) {

        //     winAmountData.push({ name: winData[i].plName, plId: winData[i].plRoomNetId, score: winData[i].score, win: this.potDistribution[i] })

        // }
        console.log("=============================");
        console.log("Win Details of " + this.currentGameRoundId);
        console.log(winAmountData);

        LogMessage(JSON.stringify(winAmountData), this);
        LogMessage(JSON.stringify(winAmountData), this);

        sendToAnalytics({
            collection: DBCollectionNames.WIN_REPORT,
            data: {
                report: winAmountData,
                tableId: TableID,
                gameRoundId: this.currentGameRoundId,
                serverId: process.env.SERVERID,
                time: new Date(),
            }
        })

        console.log("==============================");

        let playersInvolvedInRake = winAmountData.filter((result) => {
            return result.win.isGt(new Money(this.entryFee))
        }).map((result) => {
            return this.PlayersUniqIdDict[result.plId].playerID;
        });

        let finalWinData = await this.completeGameEndCalls(winAmountData, msg)

        LogGameStateToDB(LogGameStates.MONEY_CREDITED, this, finalWinData); //Log To DB


        let allLeftPlayers = this.leftPlayersForClientSending.map((pl) => {
            // if(!this.PlayersUniqIdDict[pl.plRoomNetId]) 
            return { name: pl.plName, plId: pl.plRoomNetId, score: pl.score, win: 0, isDraw: false }
        });


        //compare if finalWinData has similar data as allLeftPlayers 
        //if yes then remove that player from allLeftPlayers

        for (let i = 0; i < finalWinData.length; i++) {
            let index = allLeftPlayers.findIndex((pl) => { return pl.plId == finalWinData[i].plId })

            if (index != -1) {
                allLeftPlayers.splice(index, 1)
            }
        }


        let gameEndMsg = {
            t: MSGTYPE.GAMEENDED,
            data: moveTokensData,
            msg: msg,
            gState: this.getLudoState(),
            winData: finalWinData,
            leftList: allLeftPlayers.filter((pl) => { return pl != undefined }),
        }

        this.currentGameState = GAMESTATE.ENDED;

        console.log(gameEndMsg)
        this.sendMessageToAll(gameEndMsg)
        if (this.rake.value > 0) {
            await CallRakeCreditAPI(this.rake.value, this.currentGameRoundId, playersInvolvedInRake);
        } else {
            console.log("############### Game had zero rake ###############" + this.rake.value)
        }
        LogGameStateToDB(LogGameStates.GAME_END, this); //Log To DB
        this.resultCalculationStarted = false

        // callTableGameEndingAPI(GamesappGameID, this.tableGameId, this.currentGameSession)

        //Game End Report
        clearTimeout(this.turnTimeout);
        clearTimeout(this.gamePlayTimeout);

        // await new Promise(r => setTimeout(r, 1000));
        // this.kickInActivePlayers();


        if (this.currentPlayersCount > 0) {
            //  const reserveServerResponse = await CallReserveServerAPI();

            // if(reserveServerResponse)
            await this.kickAllPlayers(null);
        }



        if (this.currentGameReport && !this.hasReportSent) {
            this.currentGameReport.endTime = new Date();
            LogMessage("Sending Game Round Report", this);

            this.hasReportSent = true;
            sendToAnalytics({
                collection: DBCollectionNames.GAME_ROUND_REPORTS,
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
    }

    async kickAllPlayers(serverDetails: { id: string, address: string } | null) {
        const keys = Object.keys(this.PlayersUniqIdDict);
        LogMessage("Kicking PLayers " + keys.length, this);

        for (let i = 0; i < keys.length; i++) {
            const player = this.PlayersUniqIdDict[keys[i]];

            if (player) {

                let gameEndReason = "";

                if (player.resultReason !== "" && player.hasDeposited) {
                    gameEndReason = player.resultReason;
                }

                console.log("############## Unlocking funds for player " + player.playerID + " ##############")
                const unlockFunds = await CallLockFundsAPI(player.playerID, 0, this.currentGameRoundId, false, player.hasDeposited, gameEndReason);

                if (unlockFunds.success) {
                    player.sendMessage({
                        t: "restartGame",
                        data: serverDetails === null ? undefined : {
                            serverId: serverDetails.id,
                            serverAddress: serverDetails.address,
                        }
                    });
                }

                this.removePlayerFromRoom(player, true, RemovePlayerEvent.KICKED, false)
            }
        }
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




    getSeatId(playerId: string): string {

        for (let i = 0; i < this.maxPlayers; i++) {
            if (this.PlayersUniqIdDict[i] && this.PlayersUniqIdDict[i].playerID == playerId) {
                return i.toString();
            }
        }

        return (-1).toString();
    }

    swap(arr: any, xp: any, yp: any) {
        var temp = arr[xp];
        arr[xp] = arr[yp];
        arr[yp] = temp;
    }

    // An optimized version of Bubble Sort
    bubbleSort(arr: Player[], n: any) {
        var i, j;
        for (i = 0; i < n - 1; i++) {
            for (j = 0; j < n - i - 1; j++) {
                if (arr[j].score < arr[j + 1].score) {
                    this.swap(arr, j, j + 1);

                }
            }
        }
    }

    async completeGameEndCalls(winAmountData: { name: string; plId: number; score: number; win: Money; isDraw: boolean }[], gameEndReason: GAMEENDCONDITION) {



        let returnWinData: { name: string; plId: number; score: number; win: number; isDraw: boolean }[] = [];

        let sortDependsOnScoreInDescendingOrder = winAmountData.sort((a, b) => b.score - a.score);

        for (let i = 0; i < winAmountData.length; i++) {


            if (this.PlayersUniqIdDict[winAmountData[i].plId]) {



                if (this.currentGameReport) {

                    this.currentGameReport.result[this.PlayersUniqIdDict[winAmountData[i].plId].playerID] = {
                        amount: winAmountData[i].win.value,
                        score: winAmountData[i].score
                    }
                }



                // let result = await callUpdateCoinWalletAPI(
                //     this.PlayersUniqIdDict[winAmountData[i].plId].playerID,
                //     GamesappGameID,
                //     this.tableGameId,
                //     winAmountData[i].win.toString(),
                //     "PLAYER_WIN",
                //     true,
                //     "Ludo Win", this.currentGameSession);


                LogMessage(`Crediting Amount : ${winAmountData[i].win.value}`, this, this.PlayersUniqIdDict[winAmountData[i].plId]);

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
                    console.log(e)
                    console.log("############## Error in populateReason ###########")

                }


                if (winAmountData[i].win.value <= 0) {
                    LogMessage(`Winning Amount is 0`, this, this.PlayersUniqIdDict[winAmountData[i].plId]);
                    console.log(`Winning Amount is 0 skipping crediting for ${this.PlayersUniqIdDict[winAmountData[i].plId].playerID}!`);
                    // continue;
                } else {
                    let result = await CallCreditWalletAPI(
                        this.PlayersUniqIdDict[winAmountData[i].plId].playerID,
                        winAmountData[i].win.value,
                        this.currentGameRoundId, !winAmountData[i].isDraw
                    );

                    if (result != undefined && result != null) {
                        LogMessage(`Credited Amount : ${winAmountData[i].win.value} + Rake : ${result.rake}`, this, this.PlayersUniqIdDict[winAmountData[i].plId]);

                        console.log("Winning Amount Credited!");
                        winAmountData[i].win.subtract(new Money(result.rake))

                        this.rake.add(new Money(result.rake));
                    } else {
                        LogMessage(`Credit Amount Failed`, this, this.PlayersUniqIdDict[winAmountData[i].plId]);

                        if (this.currentGameReport) {
                            this.currentGameReport.isEndedCleanly = false;
                        }
                        LogErrorToDB({
                            functionName: "callUpdateCoinWallerAPI",
                            properties: { plId: winAmountData[i].plId },
                            servId: process.env.SERVERID,
                            time: new Date(),
                            errorCode: ErrorCode.MONEY_CREDITED_FAIL,
                            reason: "Winning Amount credit failed",
                        });
                    }
                }
            }
            else {
                console.log("Winning Player has also left the table")
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
    }
    private populateReason(gameEndReason: GAMEENDCONDITION, winAmountData: { name: string; plId: number; score: number; win: Money; isDraw: boolean; }[], i: number, player: Player, sortDependsOnScoreInDescendingOrder: { name: string; plId: number; score: number; win: Money; isDraw: boolean; }[]) {

        if (gameEndReason == GAMEENDCONDITION.ALLOPPONENTLEFT || gameEndReason == GAMEENDCONDITION.ALLLEFTBEFORESTART) {
            if (winAmountData[i].win.value > 0) {
                player.resultReason = `You won because all your opponents left the game`;
            } else {
                player.resultReason = `You lost because all you opponents left the game`;
            }
        } else {

            if (winAmountData[i].isDraw) {
                player.resultReason = `The game got tied. You neither lost or won the game.`;

            } else {
                let filter = sortDependsOnScoreInDescendingOrder.filter((x) => x.plId != winAmountData[i].plId);
                let maxScore = filter[0].score;

                if (winAmountData[i].win.value > 0) {

                    if (gameEndReason == GAMEENDCONDITION.ALLTOKENSIN)
                        player.resultReason = `You won because you moved all tokens to home before your opponent`;

                    else
                        player.resultReason = `You won because you scored ${winAmountData[i].score} points and your opponent scored ${maxScore} points`;

                } else {
                    if (gameEndReason == GAMEENDCONDITION.ALLTOKENSIN)
                        player.resultReason = `You lost the game because your opponent moved all tokens to home before you`;

                    else
                        player.resultReason = `You lost the game because you scored ${winAmountData[i].score} points and your opponent scored ${maxScore} points`;
                }
            }
        }
    }

    async turnTimerLoop() {

        if (this.currPlAtTurn && this.PlayersUniqIdDict[this.currPlAtTurn.plRoomNetId]) {
            this.turnTimer--;
        } else {
            this.turnTimer = 0
        }


        let timerMsg = {
            t: MSGTYPE.TURNTIMER,
            data: this.turnTimer,
            currPlTurn: this.currPlAtTurn.plRoomNetId
        }
        this.sendMessageToAll(timerMsg)

        // console.log("Running TURN TIMER " + this.turnTimer)

        if (this.turnTimer == 0) {
            let playerSkippingTurn = this.currPlAtTurn.plRoomNetId

            LogMessage(`Player ${playerSkippingTurn} skipped turn`, this, this.PlayersUniqIdDict[playerSkippingTurn]);

            if (this.currPlAtTurn != null && this.currPlAtTurn != undefined) {
                this.currPlAtTurn.skippedTurns++;
                this.currPlAtTurn.state = PLAYERSTATE.WAITING
            }


            //this.currPlAtTurn = 
            this.getNextPlayerForTurn()


            if (this.gameShouldEndNow && this.currPlAtTurn.plRoomNetId == this.getFirstPlayerId()) {

                await this.endLudoGame({}, GAMEENDCONDITION.TURNSKIPPED)
            } else {
                let turnSkipMsg = {
                    t: MSGTYPE.TURNSKIPPED,
                    plId: playerSkippingTurn,
                    nextRoll: this.currPlAtTurn.plRoomNetId
                }
                this.sendMessageToAll(turnSkipMsg)
                this.currPlAtTurn.state = PLAYERSTATE.ROLLDICE;

                this.turnTimer = this.turnTimeVal;
                clearTimeout(this.turnTimeout)
                this.turnTimeout = setTimeout(this.turnTimerLoop.bind(this), 1000)

                if (this.PlayersUniqIdDict[playerSkippingTurn] && this.PlayersUniqIdDict[playerSkippingTurn].skippedTurns >= 3) {
                    let plKillMsg = {
                        t: MSGTYPE.THREESKIPS,
                        plId: playerSkippingTurn,
                    }
                    this.PlayersUniqIdDict[playerSkippingTurn].sendMessage(plKillMsg)
                    if(this.PlayersUniqIdDict[playerSkippingTurn].isDisconnected) {
                        this.PlayersUniqIdDict[playerSkippingTurn].resultReason = `You lost because your internet got disconnected and you could not join back game in time.`;
                    }
                    this.removePlayerFromRoom(this.PlayersUniqIdDict[playerSkippingTurn], true, RemovePlayerEvent.TIMEOUT)
                }
            }


        } else {
            this.turnTimeout = setTimeout(this.turnTimerLoop.bind(this), 1000)
        }
    }
    waitTimerLoop() {


        this.waitTimer--;
        //   console.log("Running Wait Timer Loop ==== " + this.waitTimer)
        //   console.log("Running Wait Timer Loop ==== " + this.waitTimeout)

        let waitTimerMsg = {
            t: MSGTYPE.WAITTIMER,
            data: this.waitTimer,
        }

        this.sendMessageToAll(waitTimerMsg)




        if (this.waitTimer == 0) {
            if (this.currentPlayersCount >= this.minPlayers) {
                clearTimeout(this.waitTimeout)

                this.gameInStartProcess = true;
                this.currentGameState = GAMESTATE.STARTING;

                console.log("########## Setting TimeOut for 3 seconds ##########")

                setTimeout(() => {
                    this.startTheGame();
                }, 3000);

            } else {
                this.waitTimer = this.waitTimerVal;
                this.waitTimeout = setTimeout(this.waitTimerLoop.bind(this), 1000)
            }
        } else {

            this.waitTimeout = setTimeout(this.waitTimerLoop.bind(this), 1000)

        }
    }


    getNextPlayerForTurn() {
        console.log("getting next player")
        let nextPlayer = null;
        let currPlId = this.currPlAtTurn != null ? this.currPlAtTurn.plRoomNetId : 0
        while (nextPlayer == null || nextPlayer == undefined) {
            console.log("while loop 1")

            if (this.currentPlayersCount <= 1) {
                return null;
            }


            currPlId++
            if (currPlId > 3) {
                currPlId = 0
            }
            nextPlayer = this.PlayersUniqIdDict[currPlId]

        }
        this.currPlAtTurn = nextPlayer;

        if (!this.currPlAtTurn) {
            LogErrorToDB({
                functionName: "getNextPlayerForTurn",
                reason: "Next player assigned as null or undefined",
                properties: { tableGameId: TableID, session: this.currentGameRoundId },
                time: new Date(),
                servId: process.env.SERVERID,
                errorCode: ErrorCode.NEXT_PLAYER_NULL

            });
        }
        if (this.currPlAtTurn)
            LogMessage("Turn Changed to " + this.currPlAtTurn.plRoomNetId + " with state " + PLAYERSTATE[this.currPlAtTurn.state], this, this.currPlAtTurn);

        return currPlId;
    }

    getLudoState(): any {
        let ludoState: { [id: string]: number } = {}
        let ludoScore: { [id: number]: number } = { 0: 0, 1: 0, 2: 0, 3: 0 }
        for (let key of Object.keys(this.board.Tokens)) {

            let token = this.board.Tokens[key];
            if (this.PlayersUniqIdDict[token.tokenType] != null && this.PlayersUniqIdDict[token.tokenType] != undefined) {
                ludoState[token.tokenId] = token.currPlace.postionNum
                ludoScore[token.tokenType] += token.score;
                this.PlayersUniqIdDict[token.tokenType].score = ludoScore[token.tokenType]
            } else {
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


    potDistribution: number[] = []
}
