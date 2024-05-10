"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopRestartingGames = exports.getLiveTables = void 0;
const Utils_1 = require("./Entities/Utils");
const server_1 = require("./server");
// import { callSyncScript } from "./scriptRunner";
function getLiveTables() {
    if (!server_1.Table)
        return {};
    try {
        const obj = {
            players: [],
            gameId: server_1.Table.currentGameRoundId,
            gameState: Utils_1.GAMESTATE[server_1.Table.currentGameState],
            gameTimer: server_1.Table.gamePlayTimer,
            currentTurn: server_1.Table.currPlAtTurn !== null && server_1.Table.currPlAtTurn !== undefined ? server_1.Table.currPlAtTurn.playerID : "",
            type: server_1.Table.tableTypeID,
            state: server_1.Table.currentGameState,
            serverState: (0, Utils_1.getServerState)()
        };
        for (let i = 0; i < server_1.Table.maxPlayers; i++) {
            if (server_1.Table.PlayersUniqIdDict[i]) {
                let plObj = {
                    id: server_1.Table.PlayersUniqIdDict[i].playerID,
                    state: server_1.Table.PlayersUniqIdDict[i].state,
                    isDisconnected: server_1.Table.PlayersUniqIdDict[i].isDisconnected,
                };
                obj.players.push(plObj);
            }
        }
        return obj;
    }
    catch (error) {
        console.log(error);
        return {};
    }
    // return tablesList;
}
exports.getLiveTables = getLiveTables;
const stopRestartingGames = () => {
    // for(let tableID in GameRoomsDict)
    // {
    //     GameRoomsDict[tableID].stopRestart = true;
    // }
    //
    // console.log("Server Going to stop after closing all tables");
    //
    // sendToAnalytics({collection : DBCollectionNames.SUCCESS, data : {
    //     ApiName : "stopRestartingGames",
    //     time : new Date(),
    //     servId : process.env.SERVERID,
    // }});
};
exports.stopRestartingGames = stopRestartingGames;
// export function syncChanges(req : any, res : any) {
//   readJson(req, (obj : any) => {
//     //     try
//     //     {
//     const params = (JSON.parse(obj));
//     const token = params.token;
//     if(token !== "juggletheservers") {
//       res.writeStatus('401 Invalid Request')
//                   .writeHeader('Access-Control-Allow-Origin', '*')
//                   .writeHeader('Access-Control-Allow-Methods', 'OPTIONS, POST, GET')
//                   .end(JSON.stringify({data : "Invalid Access"}));
//                   return;
//     }
//     // callSyncScript();
//     res.writeStatus('200 OK')
//                   .writeHeader('Access-Control-Allow-Origin', '*')
//                   .writeHeader('Access-Control-Allow-Methods', 'OPTIONS, POST, GET')
//                   .end(JSON.stringify({data : "Syncing..."}));
//                   return;
//   }, (err : any) => {
//     console.log(err);
//     console.log('Ugh!');
//   });
// }
function readJson(res, cb, err) {
    let buffer;
    /* Register data cb */
    res.onData((ab, isLast) => {
        let chunk = Buffer.from(ab);
        if (isLast) {
            if (buffer) {
                cb((Buffer.concat([buffer, chunk])));
            }
            else {
                cb((chunk));
            }
        }
        else {
            if (buffer) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            else {
                buffer = Buffer.concat([chunk]);
            }
        }
    });
    /* Register error cb */
    res.onAborted(err);
}
// export const removePlayerFromRoom = (res : any, req: any) => {
//   console.log("Remove Player from room Request");
//   readJson(res, (obj : any) => {
//     try
//     {
//         console.log(obj);
//         const params = (JSON.parse(obj));
//
//         const tableId : string = params.tableId;
//         const playerId : string = params.playerId;
//         const apiKey : string = params.apiKey;
//
//         if(apiKey != process.env.GS_KEY)
//         {
//             res.writeStatus('400 Invalid Request')
//             .writeHeader('Access-Control-Allow-Origin', '*')
//             .writeHeader('Access-Control-Allow-Methods', 'OPTIONS, POST, GET')
//             .end(JSON.stringify({message : "Invalid Access."}));
//             return;
//         }
//
//         // let table = GameRoomsDict[tableId];
//
//         if(!table)
//         {
//             res.writeStatus('400 Invalid Request')
//             .writeHeader('Access-Control-Allow-Origin', '*')
//             .writeHeader('Access-Control-Allow-Methods', 'OPTIONS, POST, GET')
//             .end(JSON.stringify({message : "Invalid Table ID"}));
//             return;
//         }
//
//         let player! : Player;
//
//         Object.values(table.PlayersUniqIdDict).forEach(p => {
//             if(p.playerID == playerId)
//             {
//                 player = p;
//             }
//         });
//
//         if(!player)
//         {
//             res.writeStatus('400 Invalid Request')
//             .writeHeader('Access-Control-Allow-Origin', '*')
//             .writeHeader('Access-Control-Allow-Methods', 'OPTIONS, POST, GET')
//             .end(JSON.stringify({message : "Invalid Player ID"}));
//             return;
//         }
//
//
//         player.sendMessage({t : MSGTYPE.ERROR, data : `You have been removed from the table.`, code : ErrorCode.NULL});
//         table.removePlayerFromRoom(player, true, RemovePlayerEvent.KICKED);
//
//         res.writeStatus('200 OK')
//         .writeHeader('Access-Control-Allow-Origin', '*')
//         .writeHeader('Access-Control-Allow-Methods', 'OPTIONS, POST, GET')
//         .end(JSON.stringify({message : "Player removed successfully."}));
//     } catch(error : any)
//     {
//         console.log(error);
//         res.writeStatus('400')
//         .writeHeader('Access-Control-Allow-Origin', '*')
//         .writeHeader('Access-Control-Allow-Methods', 'OPTIONS, POST, GET')
//         .end(JSON.stringify({message : "Invalid Request."}));
//     }
//   }, () => {
//     console.log('Ugh!');
//   });
// };
//# sourceMappingURL=apiroutes.js.map