"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogEnd = exports.LogMessage = exports.TableLogInit = void 0;
const console_1 = require("console");
const Utils_1 = require("./Entities/Utils");
// get fs module for creating write streams
const fs = require("fs");
// const gameLoggers : {[id : string] : Console} = {};
const tableLoggers = {};
function TableLogInit(table) {
    if (tableLoggers[table.currentGameRoundId])
        return;
    console.log("TableLogInit", table.currentGameRoundId);
    tableLoggers[table.currentGameRoundId] = new console_1.Console({
        stdout: fs.createWriteStream(`${table.currentGameRoundId}-stdOut.txt`)
    });
    tableLoggers[table.currentGameRoundId].log(`====${table.currentGameRoundId} | ${process.env.SERVERID}====`);
}
exports.TableLogInit = TableLogInit;
// export function LogInit(table : TableGameRoom)
// {
//     gameLoggers[table.currentGameRoundId] = new Console({
//             stdout: fs.createWriteStream(`${table.currentGameRoundId}-stdOut.txt`)
//           });
//         gameLoggers[table.currentGameRoundId].log(`====${TableID} | ${process.env.SERVERID}====`);
// }
function LogMessage(msg, table, pl = undefined) {
    if (!tableLoggers[table.currentGameRoundId]) {
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
exports.LogMessage = LogMessage;
function TableLogMessage(msg, table) {
    let message = "";
    message = `${msg} || ${new Date()}`;
    tableLoggers[Utils_1.TableID].error(message);
    // console.log(message);
}
function LogEnd(table) {
    // tableLoggers[table.currentGameRoundId].log(`====${table.currentGameRoundId} | ${process.env.SERVERID}====`);
    tableLoggers[table.currentGameRoundId].log(`====END====`);
    //delete key from dictionary
    delete tableLoggers[table.currentGameRoundId];
    //rename the file
    fs.rename(`${table.currentGameRoundId}-stdOut.txt`, `ended-${table.currentGameRoundId}-stdOut.txt`, function (err) {
        if (err)
            throw err;
        console.log('File Renamed.');
    });
    // delete gameLoggers[table.currentGameRoundId];
}
exports.LogEnd = LogEnd;
//# sourceMappingURL=LoggingHandler.js.map