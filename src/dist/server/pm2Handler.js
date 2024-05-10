"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestartServer = exports.deleteProcess = void 0;
const pm2 = require("pm2");
function deleteProcess() {
    pm2.connect(function (err) {
        if (err) {
            console.log("##################### ERROR in ending process #####################");
            console.log(err);
            process.exit(2);
        }
        //delete itself
        pm2.delete(process.env.SERVERID ? process.env.SERVERID : "unknown", (err, proc) => {
            // Disconnects from PM2
            pm2.disconnect();
            console.log("##################### ENDED PROCESS PM2  #####################");
        });
    });
}
exports.deleteProcess = deleteProcess;
function RestartServer() {
    pm2.connect(function (err) {
        if (err) {
            console.error(err);
            process.exit(2);
        }
        // pm2.start({
        //     script    : 'api.js',
        //     name      : 'api'
        // }, function(err, apps) {
        //     if (err) {
        //         console.error(err)
        //         return pm2.disconnect()
        //     }
        //
        //     pm2.list((err, list) => {
        //         console.log(err, list)
        //
        //         pm2.restart('api', (err, proc) => {
        //             // Disconnects from PM2
        //             pm2.disconnect()
        //         })
        //     })
        // })
        pm2.restart(process.env.SERVERID ? process.env.SERVERID : "GUAT1", (err, proc) => {
            console.log("Restarted");
            // Disconnects from PM2
            pm2.disconnect();
        });
    });
}
exports.RestartServer = RestartServer;
//# sourceMappingURL=pm2Handler.js.map