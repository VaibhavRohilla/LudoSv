import { Console } from "console";
import { Player } from "./Entities/Player";
import { TableGameRoom } from "./Entities/TableGameRoom";
import { TableID } from "./Entities/Utils";
import { Table } from "./server";


// get fs module for creating write streams
const fs = require("fs");


// const gameLoggers : {[id : string] : Console} = {};
const tableLoggers: { [id: string]: Console } = {};



export function TableLogInit(table: TableGameRoom) {
    if (tableLoggers[table.currentGameRoundId])
        return;

    console.log("TableLogInit", table.currentGameRoundId);
    tableLoggers[table.currentGameRoundId] = new Console({
        stdout: fs.createWriteStream(`${table.currentGameRoundId}-stdOut.txt`)
    });



    tableLoggers[table.currentGameRoundId].log(`====${table.currentGameRoundId} | ${process.env.SERVERID}====`);

}

// export function LogInit(table : TableGameRoom)
// {
//     gameLoggers[table.currentGameRoundId] = new Console({
//             stdout: fs.createWriteStream(`${table.currentGameRoundId}-stdOut.txt`)
//           });

//         gameLoggers[table.currentGameRoundId].log(`====${TableID} | ${process.env.SERVERID}====`);
// }


export function LogMessage(msg: string, table: TableGameRoom, pl: Player | undefined = undefined) {

    if(!tableLoggers[table.currentGameRoundId])
    {
       return;
    }

    let message = "";
    if (pl)
        message = `${pl.playerID} => ${msg} || ${new Date()}`;
    else
        message = `${msg} || ${new Date()}`;

    // gameLoggers[table.currentGameRoundId].log(message);
    console.log(table.currentGameRoundId + " => " + message);
    //tableLoggers[table.currentGameRoundId].log(message);

    // console.log(message);
}



function TableLogMessage(msg: string, table: TableGameRoom) {
    let message = "";
    message = `${msg} || ${new Date()}`;

    tableLoggers[TableID].error(message);

    // console.log(message);
}


export function LogEnd(table: TableGameRoom) {
    // tableLoggers[table.currentGameRoundId].log(`====${table.currentGameRoundId} | ${process.env.SERVERID}====`);


    tableLoggers[table.currentGameRoundId].log(`====END====`);

    //delete key from dictionary

    delete tableLoggers[table.currentGameRoundId];

    //rename the file
    fs.rename(`${table.currentGameRoundId}-stdOut.txt`, `ended-${table.currentGameRoundId}-stdOut.txt`, function (err:any) {
        if (err) throw err;
        console.log('File Renamed.');
    });

    // delete gameLoggers[table.currentGameRoundId];
}

