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
exports.CallSendStatisticsAPI = exports.sendToAnalytics = exports.CallDebitWalletAPI = exports.CallCreditWalletAPI = exports.CallDeleteWalletAPI = exports.CallRakeCreditAPI = exports.callHeartBeatAPI = exports.CallLockFundsAPI = exports.CallUpdatePlayerStatus = exports.callGetTableTypesAPI = exports.APIEndPoints = exports.DBCollectionNames = void 0;
const server_1 = require("./server");
const Money_1 = require("./Entities/Money");
const Utils_1 = require("./Entities/Utils");
const apiroutes_1 = require("./apiroutes");
const version_1 = require("./version");
const axios = require('axios');
const { performance } = require('perf_hooks');
var DBCollectionNames;
(function (DBCollectionNames) {
    DBCollectionNames["FAILED"] = "GServerAPILogs";
    DBCollectionNames["SUCCESS"] = "GsSuccessAPILogs";
    DBCollectionNames["LOGGING_FAILED"] = "GSLoggingFailed";
    DBCollectionNames["BALANCER_FAILED"] = "GStoBalancerAPIFailed";
    DBCollectionNames["BALANCER_LOGGING_FAILED"] = "GStoBalancerLoggingFailed";
    DBCollectionNames["ERROR_IN_GAMESERVER"] = "GameServerErrorLogs";
    DBCollectionNames["GAME_STATES_LOGS"] = "GsGameStatesLogs";
    DBCollectionNames["BALANCER_SUCCESS"] = "GsToBalancerSuccess";
    DBCollectionNames["GSAPIFAILED"] = "GSAPIFAILED";
    DBCollectionNames["GSAPISUCCESS"] = "GSAPISUCCESS";
    DBCollectionNames["UnexpectedErrors"] = "UnexpectedErrorsLogs";
    DBCollectionNames["WIN_REPORT"] = "WinReports";
    DBCollectionNames["SOCKET_LOGS"] = "SocketLogs";
    DBCollectionNames["GAME_ROUND_REPORTS"] = "GameRoundReports";
})(DBCollectionNames = exports.DBCollectionNames || (exports.DBCollectionNames = {}));
var APIEndPoints;
(function (APIEndPoints) {
    APIEndPoints["HEARTBEAT"] = "/api/heartbeat";
})(APIEndPoints = exports.APIEndPoints || (exports.APIEndPoints = {}));
const LockInAPIURL = process.env.LOCKAPIURL;
const LockInAPIToken = process.env.LOCKAPITOKEN;
const ChargeAPIURL = process.env.CHARGEAPIURL;
const ChargeAPIToken = process.env.CHARGEAPITOKEN;
const RewardAPIURL = process.env.REWARDAPIURL;
const RewardAPIToken = process.env.REWARDAPITOKEN;
const RakeAPIURL = process.env.RAKEAPIURL;
const RakeAPIToken = process.env.RAKEAPITOKEN;
const UpdateStatisticsURL = process.env.UPDATESTATISTICSAPIURL;
const DeleteAPIURL = process.env.DELETEGAMEWALLETAPIURL;
const DeleteAPIToken = process.env.DELETEGAMEWALLETAPITOKEN;
function callGetTableTypesAPI(gameId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const resp = yield axios.get(process.env.APIURL + `/api/v1/games/table/list?gameId=${gameId}`);
            for (let i = 0; i < resp.data.data.length; i++) {
                server_1.TableTypesDict[resp.data.data[i].id] = resp.data.data[i];
            }
            sendToAnalytics({
                collection: DBCollectionNames.SUCCESS, data: {
                    APIname: "GetTableTypesAPI",
                    APIURL: process.env.APIURL + `/api/v1/games/table/list?gameId=${gameId}`,
                    REQUEST: `GameID : ${gameId}`,
                    RESPONSE: resp.data.data,
                    time: new Date(),
                    servId: process.env.SERVERID
                }
            });
        }
        catch (error) {
            console.log("@ ERROR => GetTableTypesAPI @");
            try {
                sendToAnalytics({
                    collection: DBCollectionNames.FAILED, data: {
                        APIname: "GetTableTypesAPI",
                        APIURL: process.env.APIURL + `/api/v1/games/table/list?gameId=${gameId}`,
                        REQUEST: `GameID : ${gameId}`,
                        error: error.response.data,
                        time: new Date(),
                        servId: process.env.SERVERID
                    }
                });
                console.log(error.response.data);
            }
            catch (logError) {
                console.log("@ ERROR_LOGGING => GetTableTypesAPI @");
                sendToAnalytics({
                    collection: DBCollectionNames.LOGGING_FAILED, data: {
                        APIname: "GetTableTypesAPI",
                        APIURL: process.env.APIURL + `/api/v1/games/table/list?gameId=${gameId}`,
                        REQUEST: `GameID : ${gameId}`,
                        logError: logError,
                        error: error,
                        time: new Date(),
                        servId: process.env.SERVERID
                    }
                });
            }
        }
    });
}
exports.callGetTableTypesAPI = callGetTableTypesAPI;
function CallUpdatePlayerStatus(playerId, globalState, serverAddr, entryFee, tableTypeId) {
    return __awaiter(this, void 0, void 0, function* () {
        const payload = {
            userId: playerId,
            state: globalState,
            serverAddress: serverAddr,
            entryFee: entryFee,
            tableType: tableTypeId
        };
        console.log("CallUpdatePlayerStatus => ", JSON.stringify(payload));
        const url = UpdateStatisticsURL + ":9291/api/v1/user/update";
        try {
            const resp = yield axios.post(url, payload);
            console.log(resp.data);
            sendToAnalytics({
                collection: DBCollectionNames.SUCCESS, data: {
                    apiname: "CallUpdatePlayerStatus",
                    apiurl: url,
                    request: payload,
                    response: resp.data,
                    time: new Date(),
                    servId: process.env.SERVERID,
                    gameRoundId: server_1.Table.currentGameRoundId
                }
            });
            console.log("CallUpdatePlayerStatus", resp.data);
            return true;
        }
        catch (err) {
            console.log(err);
            sendToAnalytics({
                collection: DBCollectionNames.SUCCESS, data: {
                    apiname: "CallUpdatePlayerStatus",
                    apiurl: url,
                    request: payload,
                    response: err.response.data,
                    time: new Date(),
                    servId: process.env.SERVERID,
                    gameRoundId: server_1.Table.currentGameRoundId
                }
            });
            console.log('Failed to update player status');
            return false;
        }
    });
}
exports.CallUpdatePlayerStatus = CallUpdatePlayerStatus;
function CallLockFundsAPI(playerId, amount, gameId, lock, addTxnLog, gameEndReason) {
    return __awaiter(this, void 0, void 0, function* () {
        let payload = {
            playerId: playerId,
            amount: amount,
            gameId: gameId,
            lock: lock,
            addTxnLog: addTxnLog,
            gameEndReason: gameEndReason
        };
        let options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': LockInAPIToken
            },
            data: payload,
            url: LockInAPIURL
        };
        try {
            // const response = await axios.post(process.env.LOCKINAPIURL, payload);
            const response = yield axios(options);
            sendToAnalytics({
                collection: DBCollectionNames.SUCCESS, data: {
                    apiname: "LockFundsAPI",
                    APIURL: LockInAPIURL,
                    request: payload,
                    response: response.data,
                    time: new Date(),
                    servId: process.env.SERVERID,
                    gameRoundId: server_1.Table.currentGameRoundId
                }
            });
            console.log("CallLockFundsAPI => ", playerId);
            console.log(response.data);
            return {
                success: true,
                data: response.data.data
            };
        }
        catch (error) {
            sendToAnalytics({
                collection: DBCollectionNames.FAILED, data: {
                    apiname: "LockFundsAPI",
                    apiurl: LockInAPIURL,
                    request: payload,
                    response: error.response ? error.response.data : error,
                    time: new Date(),
                    servId: process.env.SERVERID,
                    gameRoundId: server_1.Table.currentGameRoundId
                }
            });
            console.log(error);
            return {
                success: false,
                data: "Error while locking funds"
            };
        }
    });
}
exports.CallLockFundsAPI = CallLockFundsAPI;
function callHeartBeatAPI() {
    return __awaiter(this, void 0, void 0, function* () {
        let postMsg = {
            serverId: process.env.SERVERID ? process.env.SERVERID : "GS1",
            serverName: process.env.SERVERNAME ? process.env.SERVERNAME : "GS1",
            serverAddress: process.env.SERVERADDRESS ? process.env.SERVERADDRESS : "localhost:8080",
            serverType: parseInt(process.env.SERVERTYPE ? process.env.SERVERTYPE : "1"),
            serverState: (0, Utils_1.getServerState)(),
            playerCount: server_1.Table.currentPlayersCount
        };
        try {
            const resp = yield axios.post(process.env.LOADBALANCERURL + APIEndPoints.HEARTBEAT, postMsg);
        }
        catch (error) {
            // console.log("@@@@@@@ ERROR => callHeartBeatAPI @@@@@@@@");
            // console.log(process.env.LOADBALANCERURL+APIEndPoints.HEARTBEAT);
            try {
                // console.log(error);
                // sendToAnalytics({
                //     collection: DBCollectionNames.BALANCER_FAILED, data: {
                //         APIname: "HeartBeatAPI",
                //         APIURL: process.env.LOADBALANCERURL + `/api/postheartbeat`,
                //         REQUEST: postMsg,
                //         error: error,
                //         time: new Date(),
                //         servId: process.env.SERVERID
                //     }
                // });
            }
            catch (logError) {
                console.log("@@@@@@@ ERROR_LOGGING => callHeartBeatAPI @@@@@@@@");
                sendToAnalytics({
                    collection: DBCollectionNames.BALANCER_LOGGING_FAILED, data: {
                        APIname: "HeartBeatAPI",
                        APIURL: process.env.LOADBALANCERURL + `/api/postheartbeat`,
                        REQUEST: postMsg,
                        logError: logError,
                        error: error,
                        time: new Date(),
                        servId: process.env.SERVERID
                    }
                });
            }
        }
    });
}
exports.callHeartBeatAPI = callHeartBeatAPI;
function CallRakeCreditAPI(amount, gameId, playersInvolved) {
    return __awaiter(this, void 0, void 0, function* () {
        let payload = {
            amount: amount,
            gameId: gameId,
            playersIdAr: playersInvolved
        };
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': RakeAPIToken
            },
            data: payload,
            url: RakeAPIURL
        };
        console.log("CallRakeCreditAPI => ", JSON.stringify(payload));
        try {
            // const response = await axios.post( RakeAPIURL, payload);
            const response = yield axios(options);
            console.log("Respone Rake Credit API => ", response.data);
            sendToAnalytics({
                collection: DBCollectionNames.SUCCESS, data: {
                    apiname: "CallRakeCreditAPI",
                    apiurl: RakeAPIURL,
                    request: payload,
                    response: response.data,
                    time: new Date(),
                    servId: process.env.SERVERID,
                    gameRoundId: gameId
                }
            });
            return true;
        }
        catch (err) {
            console.log("Error Rake Credit API => ", err.response.data);
            sendToAnalytics({
                collection: DBCollectionNames.FAILED, data: {
                    apiname: "CallRakeCreditAPI",
                    apiurl: RakeAPIURL,
                    request: payload,
                    response: err.response.data,
                    time: new Date(),
                    servId: process.env.SERVERID,
                    gameRoundId: gameId
                }
            });
            return false;
        }
    });
}
exports.CallRakeCreditAPI = CallRakeCreditAPI;
function CallDeleteWalletAPI(gameId) {
    return __awaiter(this, void 0, void 0, function* () {
        let payload = {
            gameId: gameId
        };
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': DeleteAPIToken
            },
            data: payload,
            url: DeleteAPIURL
        };
        console.log("########### Calling Delete Wallet API ##############");
        try {
            // const response = await axios.post(process.env.DELETEWALLETAPIURL, payload);
            const response = yield axios(options);
            sendToAnalytics({
                collection: DBCollectionNames.SUCCESS, data: {
                    apiname: "CallDeleteWalletAPI",
                    apiurl: DeleteAPIURL,
                    request: payload,
                    response: response.data,
                    time: new Date(),
                    servId: process.env.SERVERID,
                    gameRoundId: gameId
                }
            });
            console.log(response.data);
            return true;
        }
        catch (error) {
            sendToAnalytics({
                collection: DBCollectionNames.FAILED, data: {
                    apiname: "CallDeleteWalletAPI",
                    apiurl: DeleteAPIURL,
                    request: payload,
                    response: error.response.data,
                    time: new Date(),
                    servId: process.env.SERVERID,
                    gameRoundId: gameId
                }
            });
            console.log(error);
            return false;
        }
    });
}
exports.CallDeleteWalletAPI = CallDeleteWalletAPI;
function CallCreditWalletAPI(playerId, amount, gameId, cutRake = true) {
    return __awaiter(this, void 0, void 0, function* () {
        if (amount <= 0) {
            console.log("Amount is less than 0");
            return {
                success: false,
                rake: 0,
            };
        }
        let amt = new Money_1.Money(amount);
        let rake = new Money_1.Money(0);
        if (cutRake) {
            console.log("Amount : " + amt.value);
            if (amt.isGt(Money_1.Money.Zero)) {
                rake = Money_1.Money.Multiply(amt, 0.15);
                console.log("Rake : " + rake.value);
                amt.subtract(rake);
            }
        }
        console.log(`Remaining Amount : ${amt.value}`);
        const payload = {
            playerId: playerId,
            amount: amt.value,
            gameId: gameId
        };
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': RewardAPIToken
            },
            data: payload,
            url: RewardAPIURL
        };
        console.log("CallCreditWalletAPI => ", JSON.stringify(payload));
        try {
            // const response = await axios.post(process.env.REWARDAPIURL, payload);
            const response = yield axios(options);
            sendToAnalytics({
                collection: DBCollectionNames.SUCCESS, data: {
                    apiname: "CreditWalletAPI",
                    apiurl: RewardAPIURL,
                    request: payload,
                    response: response.data,
                    time: new Date(),
                    servId: process.env.SERVERID,
                    gameRoundId: server_1.Table.currentGameRoundId
                }
            });
            console.log("Respone Credit Wallet API => ", response.data);
            return {
                success: true,
                rake: rake.value,
            };
        }
        catch (err) {
            sendToAnalytics({
                collection: DBCollectionNames.FAILED, data: {
                    apiname: "CreditWalletAPI",
                    apiurl: RewardAPIURL,
                    request: payload,
                    response: err.response.data,
                    time: new Date(),
                    servId: process.env.SERVERID,
                    gameRoundId: server_1.Table.currentGameRoundId
                }
            });
            console.log("Error Credit Wallet API => ", err.response.data);
            return null;
        }
    });
}
exports.CallCreditWalletAPI = CallCreditWalletAPI;
// export async function CallReserveServerAPI() {
//     const payload = {
//         serverType: Table.tableTypeID
//     }
//     try {
//         const response = await axios.post(process.env.SERVER_INITIATOR_URL, payload);
//         sendToAnalytics({
//             collection: DBCollectionNames.SUCCESS, data: {
//                 apiname: "ReserveServerAPI",
//                 apiurl: process.env.SERVER_INITIATOR_URL,
//                 request: payload,
//                 response: response.data,
//                 time: new Date(),
//                 servId: process.env.SERVERID,
//                 gameRoundId: Table.currentGameRoundId
//             }
//         });
//         return response.data.data;
//     } catch (err: any) {
//         sendToAnalytics({
//             collection: DBCollectionNames.FAILED, data: {
//                 apiname: "ReserveServerAPI",
//                 apiurl: process.env.SERVER_INITIATOR_URL,
//                 request: payload,
//                 response: err.response.data,
//                 time: new Date(),
//                 servId: process.env.SERVERID,
//                 gameRoundId: Table.currentGameRoundId
//             }
//         });
//         return null;
//     }
// }
function CallDebitWalletAPI(playerId, amount, gameId) {
    return __awaiter(this, void 0, void 0, function* () {
        const payload = {
            playerId: playerId,
            amount: amount,
            gameId: gameId
        };
        const options = {
            headers: {
                method: 'POST',
                'Content-Type': 'application/json',
                'api-key': ChargeAPIToken
            },
            data: payload,
            url: ChargeAPIURL
        };
        console.log("CallDebitWalletAPI => ", JSON.stringify(payload));
        try {
            // const response = await axios.post(process.env.CHARGEAPIURL, payload);
            const response = yield axios(options);
            sendToAnalytics({
                collection: DBCollectionNames.SUCCESS, data: {
                    apiname: "DebitWalletAPI",
                    apiurl: ChargeAPIURL,
                    request: payload,
                    response: response.data,
                    time: new Date(),
                    servId: process.env.SERVERID,
                    gameRoundId: gameId
                }
            });
            console.log("Respone Debit Wallet API => ", response.data);
            return { status: true, message: response.data };
            ;
        }
        catch (err) {
            sendToAnalytics({
                collection: DBCollectionNames.FAILED, data: {
                    apiname: "DebitWalletAPI",
                    apiurl: ChargeAPIURL,
                    request: payload,
                    response: err.response.data,
                    time: new Date(),
                    servId: process.env.SERVERID,
                    gameRoundId: gameId
                }
            });
            console.log(`Error Debit Wallet API => ${err.response.data}`);
            return { status: false, message: JSON.stringify(err.response.data) };
        }
    });
}
exports.CallDebitWalletAPI = CallDebitWalletAPI;
function sendToAnalytics(data) {
    return __awaiter(this, void 0, void 0, function* () {
        const payload = {
            collectionName: data.collection,
            data: data.data
        };
        try {
            const apiURL = UpdateStatisticsURL + ":9291/api/v1/log";
            const resp = yield axios.post(apiURL, payload);
        }
        catch (er) {
            // console.log(er)
            console.log("Could not send to analytics");
            return 0;
        }
    });
}
exports.sendToAnalytics = sendToAnalytics;
function CallSendStatisticsAPI() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("CallSendStatisticsAPI");
        let obj = (0, apiroutes_1.getLiveTables)();
        //console.log("CallSendStatisticsAPI => ",obj);
        let apiURL = UpdateStatisticsURL;
        const options = {
            method: 'POST',
            url: apiURL + ':9290/api/v1/server/heartbeat',
            headers: { 'Content-Type': 'application/json' },
            data: {
                id: process.env.SERVERID ? process.env.SERVERID : "unknown",
                name: process.env.SERVERNAME ? process.env.SERVERNAME : "unknown",
                address: process.env.SERVERADDRESS ? process.env.SERVERADDRESS : "unknown",
                data: obj,
                version: version_1.LIB_VERSION
            }
        };
        //console.log(options.data)
        try {
            let response = yield axios.request(options);
            //   console.log("response data", response.data);
        }
        catch (error) {
            console.log(error);
        }
    });
}
exports.CallSendStatisticsAPI = CallSendStatisticsAPI;
setInterval(() => {
    CallSendStatisticsAPI();
}, 4000);
//# sourceMappingURL=apicalls.js.map