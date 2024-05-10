import {Player} from './Entities/Player';
import {TableGameRoom} from './Entities/TableGameRoom';
import axios from 'axios';
import {ErrorCode, GamesappGameID, getRandomGameId, TableTypeId} from './Entities/Utils';
import {getLiveTables, stopRestartingGames} from './apiroutes';
import {LIB_VERSION} from './version';
import {FunctionLogNames, LogErrorToDB} from './Entities/logUtils';
import {
    callGetTableTypesAPI,
    callHeartBeatAPI,
    CallLockFundsAPI,
    CallUpdatePlayerStatus,
    DBCollectionNames,
    sendToAnalytics
} from "./apicalls";
import {deleteProcess, RestartServer} from "./pm2Handler";
import {LogMessage} from "./LoggingHandler";
import {GlobalPlayerState} from "./Entities/DataTypes";
// import { uploadFile } from './logUploader';

export var unirest = require('unirest');


var cors = require('cors')


const secretKey = getRandomGameId();
console.log("Secret Key : " + secretKey);

//if (process.env.LOCAL == "true")
require('dotenv').config()

var ip = require("ip");
const serverAddress = ip.address()

const uWS = require('uWebSockets.js');

// export let isReserved = process.env.IS_RESERVED == "true";


// export function resetReserved() {
//     isReserved = false;
// }




console.log(LIB_VERSION);


//initialize a simple http server

const fs = require('fs');

axios.defaults.headers.post['x-auth-key'] = process.env.APITOKEN // for POST requests
axios.defaults.headers.get['x-auth-key'] = process.env.APITOKEN // for POST requests

const listOfActiveSockets : any[] = [];

const app = uWS.App().ws('/*', {
    /* Options */
    compression: uWS.SHARED_COMPRESSOR,
    maxPayloadLength: 16 * 1024 * 1024,
    idleTimeout: 30,
    /* Handlers */
    open: (ws: any) => {

        ws.isReady = false;
        ws.isConnectionAlive = true; //Making Connection alive
        ws.isAlive = true; //Making Connection alive

        if(listOfActiveSockets.indexOf(ws) == -1)
            listOfActiveSockets.push(ws);

        console.log("Socket Connection Open")
    },
    message: (ws: any, msg: any, isBinary: any) => {
        /* Ok is false if backpressure was built up, wait for drain */
        let message = JSON.parse(Buffer.from(msg).toString())
        if (message.t == "connect") {

            sendToAnalytics({
                collection : DBCollectionNames.SOCKET_LOGS,
                data :{
                    request : message,
                    time : new Date(),
                }
                
            });

            
            createANewPlayer(ws, message.tableGameId, message.gid, message.entryFee, message.pName, message.pImage);
        }
        else if (message.t == "pDiceRoll") {
          //  console.log(ws.player.plRoomNetId + " - " + JSON.stringify(message))

            if (ws.player.gRoom)
                ws.player.gRoom?.handleDiceRoll(ws.player);
            else
                console.log("Cant do dice roll player is not added to any room!")



        }
        else if (message.t == "pTokenSelect") {

         //   console.log(ws.player.plRoomNetId + " - " + JSON.stringify(message))
            if (ws.player.gRoom)
                ws.player.gRoom?.handleTokenMove(ws.player, message.token);
            else
                console.log("Cant do dice roll player is not added to any room!")



        }
        else if (message.t == "autoRefill") {

            console.log(ws.player.plRoomNetId + " - " + JSON.stringify(message))
            ws.player.gRoom?.callAutoRefill(ws.player.plRoomNetId)


            //create a player object
            //getPlayerData from Database

        }
        else if (message.t == "ping") {
            // console.log(ws.player.plRoomNetId+ " - "+ JSON.stringify(message))

            if(ws.player) {
                ws.isAlive = true;
                ws.player.recievePing();
            } 


           
            //create a player object
            //getPlayerData from Database

        } else if (message.t == "leaveGame")
        {
            if(ws.player)
            {
                if(ws.player.gRoom)
                    ws.player.gRoom?.handleLeaveBtnClick(ws.player);
                else
                    console.log("Can't Leave table, Player is not on table");
            } else 
            {
                console.log("Closing socket as leavegame/else");
                ws.close();
            }
        }
        else if (message.t == "switchGame")
        {
            if(ws.player)
            {
                if(ws.player.gRoom)
                    ws.player.gRoom?.handleSwitchTable(ws.player);
                else
                    console.log("Can't Switch table, Player is not on table");
            } else
            {
                ws.close();
            }
        }
    },
    drain: (ws: any) => {
        console.log('WebSocket backpressure: ' + ws.getBufferedAmount());
    },
    close: (ws: any, code: any, message: any) => {
        console.log('WebSocket closed');
        if(ws.isConnectionAlive)
        {
            ws.isConnectionAlive = false; //Making Connection alive
            console.log("Open Socket Connection Closed")
        }

        if(listOfActiveSockets.indexOf(ws) != -1)
        {
            listOfActiveSockets.splice(listOfActiveSockets.indexOf(ws),1);
        }
        playerLeftRemoveFromGame(ws)
    }
}).any('/*', (res: any, req: any) => {
    res.writeHeader('Access-Control-Allow-Origin', '*').writeHeader('Access-Control-Allow-Methods', 'OPTIONS, POST, GET').end("Hello "+ LIB_VERSION);
}).listen(parseInt(process.env.SERVER_PORT || "8080"), (token: any) => {
    if (token) {
        // console.log("Server started at " + token.address + ":" + token.port);s
        console.log('Listening to port ' + parseInt(process.env.SERVER_PORT || "8080"));
    } else {
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
export var TableTypesDict: { [id: number]: any; } = {};

let GameRoomIdCntr: number = 0;
let socketIdCntr: number = 0;
//console.log("After call log");

export let Table : TableGameRoom;
callGetTableTypesAPI(GamesappGameID).then((data: any) => {
    console.log(TableTypesDict);

    Table = new TableGameRoom(TableTypeId);

    setInterval(() => {
        callHeartBeatAPI()
        // console.log(new Date());
    }, 999);

});

export function getEntryFee() {
    return TableTypesDict[TableTypeId].maxEntryFee;
}


export async function createANewPlayer(extWs: any, tableId: string, playerId: string, playerBal: number, pName: string, pImage: string) {


    let newP: Player = new Player(extWs, tableId, playerId+"", pName, pImage);
    
    extWs.player = newP;
    Table.addPlayerToRoom(newP, playerBal);
        console.log("Player addPlayerToRoom end")
        extWs.isReady = true;

    //add player to table

}

export function resetTable()
{
    // Table   = new TableGameRoom();
    // console.log("Table Reset")
    setTimeout(() => {
        deleteProcess();
    }, 6000);
}

// setTimeout(()=> {
//     resetTable();
// }, 30 * 1000);




function playerLeftRemoveFromGame(extWs: any) {
    // console.log("extWs============")
    // console.log(extWs)

    try
    {
        if (extWs == null || extWs.player == null)
        {
            console.log('Player that left undefined');
            return;
        }
        
        console.log("Player Left Room " + extWs.player.playerID);
        
        if (extWs.player.gRoom)
            extWs.player.gRoom?.removePlayerFromRoom(extWs.player, false);


    } catch(error)
    {
        LogErrorToDB(
            {
            functionName : FunctionLogNames.ON_PLAYER_WS_DISCONNECT,
            reason : 'Removing player from server on ws disconnect',
            time : new Date(),
            properties : {},
            errorCode : ErrorCode.NULL,
            servId : process.env.SERVERID,
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
}



// app.post('/syncChanges', syncChanges);

app.get('/getLiveGames', (res : any, req : any) => {
    /* It does Http as well */
    res.writeStatus('200 OK').writeHeader('Access-Control-Allow-Origin', '*').writeHeader('Access-Control-Allow-Methods', 'OPTIONS, POST, GET').end(JSON.stringify(getLiveTables()));
});



// app.post('/kickPlayer', removePlayerFromRoom);

app.get('/stopRestartingGames', (res : any, req : any) => {
    /* It does Http as well */
    stopRestartingGames();
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