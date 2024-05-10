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
exports.resetTable = exports.createANewPlayer = exports.getEntryFee = exports.Table = exports.TableTypesDict = exports.unirest = void 0;
const Player_1 = require("./Entities/Player");
const TableGameRoom_1 = require("./Entities/TableGameRoom");
const axios_1 = require("axios");
const Utils_1 = require("./Entities/Utils");
const apiroutes_1 = require("./apiroutes");
const version_1 = require("./version");
const logUtils_1 = require("./Entities/logUtils");
const apicalls_1 = require("./apicalls");
const pm2Handler_1 = require("./pm2Handler");
// import { uploadFile } from './logUploader';
exports.unirest = require('unirest');
var cors = require('cors');
const secretKey = (0, Utils_1.getRandomGameId)();
console.log("Secret Key : " + secretKey);
//if (process.env.LOCAL == "true")
require('dotenv').config();
var ip = require("ip");
const serverAddress = ip.address();
const uWS = require('uWebSockets.js');
// export let isReserved = process.env.IS_RESERVED == "true";
// export function resetReserved() {
//     isReserved = false;
// }
console.log(version_1.LIB_VERSION);
//initialize a simple http server
const fs = require('fs');
axios_1.default.defaults.headers.post['x-auth-key'] = process.env.APITOKEN; // for POST requests
axios_1.default.defaults.headers.get['x-auth-key'] = process.env.APITOKEN; // for POST requests
const listOfActiveSockets = [];
const app = uWS.App().ws('/*', {
    /* Options */
    compression: uWS.SHARED_COMPRESSOR,
    maxPayloadLength: 16 * 1024 * 1024,
    idleTimeout: 30,
    /* Handlers */
    open: (ws) => {
        ws.isReady = false;
        ws.isConnectionAlive = true; //Making Connection alive
        ws.isAlive = true; //Making Connection alive
        if (listOfActiveSockets.indexOf(ws) == -1)
            listOfActiveSockets.push(ws);
        console.log("Socket Connection Open");
    },
    message: (ws, msg, isBinary) => {
        var _a, _b, _c, _d, _e;
        /* Ok is false if backpressure was built up, wait for drain */
        let message = JSON.parse(Buffer.from(msg).toString());
        if (message.t == "connect") {
            (0, apicalls_1.sendToAnalytics)({
                collection: apicalls_1.DBCollectionNames.SOCKET_LOGS,
                data: {
                    request: message,
                    time: new Date(),
                }
            });
            createANewPlayer(ws, message.tableGameId, message.gid, message.entryFee, message.pName, message.pImage);
        }
        else if (message.t == "pDiceRoll") {
            //  console.log(ws.player.plRoomNetId + " - " + JSON.stringify(message))
            if (ws.player.gRoom)
                (_a = ws.player.gRoom) === null || _a === void 0 ? void 0 : _a.handleDiceRoll(ws.player);
            else
                console.log("Cant do dice roll player is not added to any room!");
        }
        else if (message.t == "pTokenSelect") {
            //   console.log(ws.player.plRoomNetId + " - " + JSON.stringify(message))
            if (ws.player.gRoom)
                (_b = ws.player.gRoom) === null || _b === void 0 ? void 0 : _b.handleTokenMove(ws.player, message.token);
            else
                console.log("Cant do dice roll player is not added to any room!");
        }
        else if (message.t == "autoRefill") {
            console.log(ws.player.plRoomNetId + " - " + JSON.stringify(message));
            (_c = ws.player.gRoom) === null || _c === void 0 ? void 0 : _c.callAutoRefill(ws.player.plRoomNetId);
            //create a player object
            //getPlayerData from Database
        }
        else if (message.t == "ping") {
            // console.log(ws.player.plRoomNetId+ " - "+ JSON.stringify(message))
            if (ws.player) {
                ws.isAlive = true;
                ws.player.recievePing();
            }
            //create a player object
            //getPlayerData from Database
        }
        else if (message.t == "leaveGame") {
            if (ws.player) {
                if (ws.player.gRoom)
                    (_d = ws.player.gRoom) === null || _d === void 0 ? void 0 : _d.handleLeaveBtnClick(ws.player);
                else
                    console.log("Can't Leave table, Player is not on table");
            }
            else {
                console.log("Closing socket as leavegame/else");
                ws.close();
            }
        }
        else if (message.t == "switchGame") {
            if (ws.player) {
                if (ws.player.gRoom)
                    (_e = ws.player.gRoom) === null || _e === void 0 ? void 0 : _e.handleSwitchTable(ws.player);
                else
                    console.log("Can't Switch table, Player is not on table");
            }
            else {
                ws.close();
            }
        }
    },
    drain: (ws) => {
        console.log('WebSocket backpressure: ' + ws.getBufferedAmount());
    },
    close: (ws, code, message) => {
        console.log('WebSocket closed');
        if (ws.isConnectionAlive) {
            ws.isConnectionAlive = false; //Making Connection alive
            console.log("Open Socket Connection Closed");
        }
        if (listOfActiveSockets.indexOf(ws) != -1) {
            listOfActiveSockets.splice(listOfActiveSockets.indexOf(ws), 1);
        }
        playerLeftRemoveFromGame(ws);
    }
}).any('/*', (res, req) => {
    res.writeHeader('Access-Control-Allow-Origin', '*').writeHeader('Access-Control-Allow-Methods', 'OPTIONS, POST, GET').end("Hello " + version_1.LIB_VERSION);
}).listen(parseInt(process.env.SERVER_PORT || "8080"), (token) => {
    if (token) {
        // console.log("Server started at " + token.address + ":" + token.port);s
        console.log('Listening to port ' + parseInt(process.env.SERVER_PORT || "8080"));
    }
    else {
        console.log('Failed to listen to port ' + parseInt(process.env.SERVER_PORT || "8080"));
    }
});
// export interface ExtWebSocket extends WebSocket {
//     gRoom: TableGameRoom;
//     isAlive: boolean;
//     uniqueId: number;
//     player: Player;
// }
// export var GameRoomsDict: { [id: string]: TableGameRoom; } = {};
exports.TableTypesDict = {};
let GameRoomIdCntr = 0;
let socketIdCntr = 0;
(0, apicalls_1.callGetTableTypesAPI)(Utils_1.GamesappGameID).then((data) => {
    console.log(exports.TableTypesDict);
    exports.Table = new TableGameRoom_1.TableGameRoom(Utils_1.TableTypeId);
    setInterval(() => {
        (0, apicalls_1.callHeartBeatAPI)();
        // console.log(new Date());
    }, 999);
});
function getEntryFee() {
    return exports.TableTypesDict[Utils_1.TableTypeId].maxEntryFee;
}
exports.getEntryFee = getEntryFee;
function createANewPlayer(extWs, tableId, playerId, playerBal, pName, pImage) {
    return __awaiter(this, void 0, void 0, function* () {
        let newP = new Player_1.Player(extWs, tableId, playerId + "", pName, pImage);
        extWs.player = newP;
        exports.Table.addPlayerToRoom(newP, playerBal);
        console.log("Player addPlayerToRoom end");
        extWs.isReady = true;
        //add player to table
    });
}
exports.createANewPlayer = createANewPlayer;
function resetTable() {
    // Table   = new TableGameRoom();
    // console.log("Table Reset")
    setTimeout(() => {
        (0, pm2Handler_1.deleteProcess)();
    }, 6000);
}
exports.resetTable = resetTable;
// setTimeout(()=> {
//     resetTable();
// }, 30 * 1000);
function playerLeftRemoveFromGame(extWs) {
    // console.log("extWs============")
    // console.log(extWs)
    var _a;
    try {
        if (extWs == null || extWs.player == null) {
            console.log('Player that left undefined');
            return;
        }
        console.log("Player Left Room " + extWs.player.playerID);
        if (extWs.player.gRoom)
            (_a = extWs.player.gRoom) === null || _a === void 0 ? void 0 : _a.removePlayerFromRoom(extWs.player, false);
    }
    catch (error) {
        (0, logUtils_1.LogErrorToDB)({
            functionName: logUtils_1.FunctionLogNames.ON_PLAYER_WS_DISCONNECT,
            reason: 'Removing player from server on ws disconnect',
            time: new Date(),
            properties: {},
            errorCode: Utils_1.ErrorCode.NULL,
            servId: process.env.SERVERID,
        });
    }
    // if(extWs.player)
    //  callPlayerLeftTableAPI("11",extWs.player.playerID, extWs.player.tableGameID)
}
// console.log(wss.clients.size)
// }, 1000);
// let nextMiniGame: number = 0;
// setInterval(() => {
//     wss.clients.forEach((ws: WebSocket) => {
//         const extWs = ws as ExtWebSocket;
//         ws.ping(null, undefined);
//     });
// console.log(wss.clients.size)
// }, 1000);
//
// setInterval(() => {
//     // console.log("Checking Connections" + listOfActiveSockets.length);
//     listOfActiveSockets.forEach((ws) => {
//         if(ws.isReady)
//         {
//             // console.log("Checking Active Conenction of " + ws.player.plRoomNetId);
//             if(ws.isAlive)
//             {
//                 ws.isAlive = false;
//             } else
//             {
//                 //Disconnect
//                 console.log('Player Discoonnected, WebSocket closing for ' + ws.player.plRoomNetId);
//                 ws.close();
//                // playerLeftRemoveFromGame(ws)
//             }
//         }
//     });
//     console.log(new Date());
// }, 5000);
const config = {
    serverId: -1,
    //  socketCnt: wss.clients.size
};
// app.post('/syncChanges', syncChanges);
app.get('/getLiveGames', (res, req) => {
    /* It does Http as well */
    res.writeStatus('200 OK').writeHeader('Access-Control-Allow-Origin', '*').writeHeader('Access-Control-Allow-Methods', 'OPTIONS, POST, GET').end(JSON.stringify((0, apiroutes_1.getLiveTables)()));
});
// app.post('/kickPlayer', removePlayerFromRoom);
app.get('/stopRestartingGames', (res, req) => {
    /* It does Http as well */
    (0, apiroutes_1.stopRestartingGames)();
    res.writeStatus('200 OK').writeHeader('Access-Control-Allow-Origin', '*').writeHeader('Access-Control-Allow-Methods', 'OPTIONS, POST, GET').end();
});
// app.get('/getLiveGames', (res : any, req : any) => {
//     /* It does Http as well */
//     res.writeStatus('200 OK').writeHeader('Access-Control-Allow-Origin', '*').writeHeader('Access-Control-Allow-Methods', 'OPTIONS, POST, GET').end(JSON.stringify(getLiveTables()));
// });
// setTimeout(async () => {
//     let i = await CallLockFundsAPI("263080", 10, "safas", true);
//     console.log(i);
// }, 2 * 1000);
//Rest API
// let router = express.Router();
// //route to handle user registration
// // parse requests of content-type - application/x-www-form-urlencoded
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(bodyParser.json());
// app.use(cors())
// app.get('/test', function (req, res, next) {
//     // Handle the get for this route
//     res.json("true");
// });
// app.use('/api', router);
// //start our server
// server.listen(4400, () => {
//     console.log(`Server started on port ${serverAddress} :)`);
// });
// setTimeout(async () => {
//     let test = await uploadFile("w4q1Di-stdOut",  __dirname + `/w4q1Di-stdOut.txt`)
//     console.log("Upload Status : " + test);
// }, 5000);
//# sourceMappingURL=server.js.map