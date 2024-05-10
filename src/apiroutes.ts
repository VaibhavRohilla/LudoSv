import { createConstructor, createImportSpecifier } from "typescript";
import { DBCollectionNames, sendToAnalytics } from "./apicalls";
import { Player, PLAYERSTATE } from "./Entities/Player";
import { ErrorCode, GAMESTATE, MSGTYPE, RemovePlayerEvent, getServerState } from "./Entities/Utils";
import { Table } from "./server";
import { table } from "console";
import { ServerState } from "./Entities/DataTypes";
// import { callSyncScript } from "./scriptRunner";


export function getLiveTables() {

if(!Table)
return {};

  try {
    const obj: {
      players: any[],
      gameId: string,
      gameState: string,
      gameTimer: number,
      currentTurn: string,
      type:string,
      state:GAMESTATE,
      serverState:ServerState | null
    } = {
      players: [],
      gameId: Table.currentGameRoundId,
      gameState: GAMESTATE[Table.currentGameState],
      gameTimer: Table.gamePlayTimer,
      currentTurn: Table.currPlAtTurn !== null && Table.currPlAtTurn !== undefined ? Table.currPlAtTurn.playerID : "",
      type:Table.tableTypeID,
      state: Table.currentGameState,
      serverState: getServerState()
      

    }

    for (let i = 0; i < Table.maxPlayers; i++) {
      if (Table.PlayersUniqIdDict[i]) {
        let plObj = {
          id: Table.PlayersUniqIdDict[i].playerID,
          state: Table.PlayersUniqIdDict[i].state,
          isDisconnected: Table.PlayersUniqIdDict[i].isDisconnected,
        }
        obj.players.push(plObj);
      }
    }



    return obj;

  } catch (error: any) {

    console.log(error);
    return {}
  }

  // return tablesList;
}

export const stopRestartingGames = () => {
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


function readJson(res: any, cb: any, err: any) {
  let buffer: any;
  /* Register data cb */
  res.onData((ab: any, isLast: any) => {
    let chunk = Buffer.from(ab);
    if (isLast) {
      if (buffer) {
        cb((Buffer.concat([buffer, chunk])));
      } else {
        cb((chunk));
      }
    } else {
      if (buffer) {
        buffer = Buffer.concat([buffer, chunk]);
      } else {
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