import {
    CreditFundsAPIRequest,
    DebitFundsAPIRequest, GlobalPlayerState,
    HeartbeatRequest,
    LockFundsAPIRequest, PlayerStatusAPIRequest, RakeCreditAPIRequest,
    ServerState
} from "./Entities/DataTypes";
import { Table, TableTypesDict } from "./server";
import { Money } from "./Entities/Money";
import exp = require("constants");
import { RemovePlayerEvent, getServerState } from "./Entities/Utils";
import { getLiveTables } from "./apiroutes";
import { LIB_VERSION } from "./version";
import { convertToObject } from "typescript";

const axios = require('axios');
const { performance } = require('perf_hooks');


export enum DBCollectionNames {
    FAILED = "GServerAPILogs",
    SUCCESS = "GsSuccessAPILogs",
    LOGGING_FAILED = "GSLoggingFailed",
    BALANCER_FAILED = "GStoBalancerAPIFailed",
    BALANCER_LOGGING_FAILED = "GStoBalancerLoggingFailed",
    ERROR_IN_GAMESERVER = "GameServerErrorLogs",
    GAME_STATES_LOGS = "GsGameStatesLogs",
    BALANCER_SUCCESS = "GsToBalancerSuccess",
    GSAPIFAILED = "GSAPIFAILED",
    GSAPISUCCESS = "GSAPISUCCESS",
    UnexpectedErrors = "UnexpectedErrorsLogs",
    WIN_REPORT = "WinReports",
    SOCKET_LOGS = "SocketLogs",
    GAME_ROUND_REPORTS = "GameRoundReports",
}

export enum APIEndPoints {
    HEARTBEAT = "/api/heartbeat",
}

const LockInAPIURL = process.env.LOCKAPIURL
const LockInAPIToken = process.env.LOCKAPITOKEN
const ChargeAPIURL = process.env.CHARGEAPIURL
const ChargeAPIToken = process.env.CHARGEAPITOKEN
const RewardAPIURL = process.env.REWARDAPIURL
const RewardAPIToken = process.env.REWARDAPITOKEN
const RakeAPIURL = process.env.RAKEAPIURL
const RakeAPIToken = process.env.RAKEAPITOKEN
const UpdateStatisticsURL = process.env.UPDATESTATISTICSAPIURL;
const DeleteAPIURL = process.env.DELETEGAMEWALLETAPIURL;
const DeleteAPIToken = process.env.DELETEGAMEWALLETAPITOKEN;






export async function callGetTableTypesAPI(gameId: string) {

    try {
        const resp = await axios.get(process.env.APIURL + `/api/v1/games/table/list?gameId=${gameId}`);

        for (let i = 0; i < resp.data.data.length; i++) {
            TableTypesDict[resp.data.data[i].id] = resp.data.data[i]
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
    } catch (error: any) {

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
        } catch (logError) {

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

}

export async function CallUpdatePlayerStatus(playerId: number, globalState: GlobalPlayerState, serverAddr: string, entryFee: number, tableTypeId: number) {
    const payload: PlayerStatusAPIRequest = {
        userId: playerId,
        state: globalState,
        serverAddress: serverAddr,
        entryFee: entryFee,
        tableType: tableTypeId
    };
    console.log("CallUpdatePlayerStatus => ", JSON.stringify(payload));
    const url = UpdateStatisticsURL + ":9291/api/v1/user/update"
    try {
        const resp = await axios.post(url, payload);
        console.log(resp.data);

        sendToAnalytics({
            collection: DBCollectionNames.SUCCESS, data: {
                apiname: "CallUpdatePlayerStatus",
                apiurl: url,
                request: payload,
                response: resp.data,
                time: new Date(),
                servId: process.env.SERVERID,
                gameRoundId: Table.currentGameRoundId
            }
        });

        console.log("CallUpdatePlayerStatus", resp.data);
        return true;
    } catch (err: any) {
        console.log(err);

        sendToAnalytics({
            collection: DBCollectionNames.SUCCESS, data: {
                apiname: "CallUpdatePlayerStatus",
                apiurl: url,
                request: payload,
                response: err.response.data,
                time: new Date(),
                servId: process.env.SERVERID,
                gameRoundId: Table.currentGameRoundId
            }
        });

        console.log('Failed to update player status');
        return false;
    }
}

export async function CallLockFundsAPI(playerId: string, amount: number, gameId: string, lock: boolean , addTxnLog :boolean, gameEndReason : string | undefined) {
    let payload: LockFundsAPIRequest = {
        playerId: playerId,
        amount: amount,
        gameId: gameId,
        lock: lock,
        addTxnLog : addTxnLog,
        gameEndReason : gameEndReason
    };

    let options = {
        method : 'POST',
        headers: {
            'Content-Type': 'application/json',
            'api-key': LockInAPIToken
        },
        data : payload,
        url : LockInAPIURL
    }

    try {

        // const response = await axios.post(process.env.LOCKINAPIURL, payload);
        const response = await axios(options);

        sendToAnalytics({
            collection: DBCollectionNames.SUCCESS, data: {
                apiname: "LockFundsAPI",
                APIURL: LockInAPIURL,
                request: payload,
                response: response.data,
                time: new Date(),
                servId: process.env.SERVERID,
                gameRoundId: Table.currentGameRoundId
            }
        });
console.log("CallLockFundsAPI => ", playerId);
        console.log(response.data);
        return {
            success: true,
            data: response.data.data
        }
    } catch (error: any) {
        sendToAnalytics({
            collection: DBCollectionNames.FAILED, data: {
                apiname: "LockFundsAPI",
                apiurl: LockInAPIURL,
                request: payload,
                response: error.response ? error.response.data : error,
                time: new Date(),
                servId: process.env.SERVERID,
                gameRoundId: Table.currentGameRoundId
            }
        });

        console.log(error);
        return {
            success: false,
            data: "Error while locking funds"
        }
    }
}

export async function callHeartBeatAPI() {

    let postMsg: HeartbeatRequest = {
        serverId: process.env.SERVERID ? process.env.SERVERID : "GS1",
        serverName: process.env.SERVERNAME ? process.env.SERVERNAME : "GS1",
        serverAddress: process.env.SERVERADDRESS ? process.env.SERVERADDRESS : "localhost:8080",
        serverType: parseInt(process.env.SERVERTYPE ? process.env.SERVERTYPE : "1"),
        serverState: getServerState(),
        playerCount: Table.currentPlayersCount
    }

    try {
        const resp = await axios.post(process.env.LOADBALANCERURL + APIEndPoints.HEARTBEAT, postMsg);

    } catch (error) {
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
        } catch (logError) {

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

}

export async function CallRakeCreditAPI(amount: number, gameId: string, playersInvolved : string[]) {
    let payload: RakeCreditAPIRequest = {
        amount: amount,
        gameId: gameId,
        playersIdAr : playersInvolved
    };

    const options = {
        method : 'POST',
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
        const response = await axios(options);
        console.log("Respone Rake Credit API => ", response.data);

        sendToAnalytics({
            collection: DBCollectionNames.SUCCESS, data: {
                apiname: "CallRakeCreditAPI",
                apiurl:  RakeAPIURL,
                request: payload,
                response: response.data,
                time: new Date(),
                servId: process.env.SERVERID,
                gameRoundId: gameId
            }
        });

        return true;
    } catch (err: any) {
        console.log("Error Rake Credit API => ", err.response.data);

        sendToAnalytics({
            collection: DBCollectionNames.FAILED, data: {
                apiname: "CallRakeCreditAPI",
                apiurl:  RakeAPIURL,
                request: payload,
                response: err.response.data,
                time: new Date(),
                servId: process.env.SERVERID,
                gameRoundId: gameId
            }
        });
        return false;
    }
}

export async function CallDeleteWalletAPI(gameId: string) {
    let payload = {
        gameId: gameId
    }

    const options = {
        method : 'POST',
        headers: {
        
            'Content-Type': 'application/json',
            'api-key': DeleteAPIToken
        },
        data: payload,
        url: DeleteAPIURL
    };


    console.log("########### Calling Delete Wallet API ##############")
    try {
        // const response = await axios.post(process.env.DELETEWALLETAPIURL, payload);
        const response = await axios(options);
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
    } catch (error: any) {
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
}

export async function CallCreditWalletAPI(playerId: string, amount: number, gameId: string, cutRake: boolean = true) {
    if (amount <= 0) {
        console.log("Amount is less than 0");
        return {
            success: false,
            rake: 0,
        };
    }

    let amt = new Money(amount);
    let rake = new Money(0);

    if (cutRake) {
        console.log("Amount : " + amt.value)
        if (amt.isGt(Money.Zero)) {
            rake = Money.Multiply(amt, 0.15);
            console.log("Rake : " + rake.value);
            amt.subtract(rake);
        }
    }

    console.log(`Remaining Amount : ${amt.value}`)



    const payload: CreditFundsAPIRequest = {
        playerId: playerId,
        amount: amt.value,
        gameId: gameId
    };

    const options = {
        method : 'POST',
        headers: {
    
            'Content-Type': 'application/json',
            'api-key': RewardAPIToken
        },
        data: payload,
        url: RewardAPIURL
    }

    console.log("CallCreditWalletAPI => ", JSON.stringify(payload));

    try {

        // const response = await axios.post(process.env.REWARDAPIURL, payload);

        const response = await axios(options);

        sendToAnalytics({
            collection: DBCollectionNames.SUCCESS, data: {
                apiname: "CreditWalletAPI",
                apiurl: RewardAPIURL,
                request: payload,
                response: response.data,
                time: new Date(),
                servId: process.env.SERVERID,
                gameRoundId: Table.currentGameRoundId
            }
        });

        console.log("Respone Credit Wallet API => ", response.data);
        return {
            success: true,
            rake: rake.value,
        }
    } catch (err: any) {
        sendToAnalytics({
            collection: DBCollectionNames.FAILED, data: {
                apiname: "CreditWalletAPI",
                apiurl: RewardAPIURL,
                request: payload,
                response: err.response.data,
                time: new Date(),
                servId: process.env.SERVERID,
                gameRoundId: Table.currentGameRoundId
            }
        });
        console.log("Error Credit Wallet API => ", err.response.data);
        return null;
    }
}

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


export async function CallDebitWalletAPI(playerId: string, amount: number, gameId: string) {
    const payload: DebitFundsAPIRequest = {
        playerId: playerId,
        amount: amount,
        gameId: gameId
    };

    const options = {
        headers: {
            method : 'POST',
            'Content-Type': 'application/json',
            'api-key': ChargeAPIToken
        },
        data: payload,
        url: ChargeAPIURL
    };

    console.log("CallDebitWalletAPI => ", JSON.stringify(payload));


    try {
        // const response = await axios.post(process.env.CHARGEAPIURL, payload);
        const response = await axios(options);
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
        return { status: true, message: response.data };;
    } catch (err: any) {

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
}




export async function sendToAnalytics(data: {
    collection: DBCollectionNames,
    data: any
}) {

    const payload = {
        collectionName: data.collection,
        data: data.data
    }

    try {

        const apiURL =   UpdateStatisticsURL + ":9291/api/v1/log"
        const resp = await axios.post(apiURL, payload);

    }
    catch (er) {
        // console.log(er)
        console.log("Could not send to analytics")
        return 0;
    }
}

export async function CallSendStatisticsAPI() {
    console.log("CallSendStatisticsAPI");

    let obj = getLiveTables();
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
            version: LIB_VERSION

        }
    };

    //console.log(options.data)

    try {
        let response = await axios.request(options);
        //   console.log("response data", response.data);

    }
    catch (error) {
        console.log(error);


    }



}

setInterval(() => {
    CallSendStatisticsAPI();
}, 4000);