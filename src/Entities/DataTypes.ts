


export interface GameEndReportAPIResponse
{
    [id : string] : boolean
}

export interface SwitchSuccessResponse
{
    success : true,
    entryFee : string,
    tableGameId : string,
    address : string
}


export interface SwitchFailedResponse
{
    success : false,
    error : string,
    hasRemoved : boolean
}

export interface TXUpdatedResponseType
{
    balance : number,
    rake : number,
}

export interface HeartbeatRequest {
    serverId: string;
    serverName: string;
    serverAddress: string;
    serverType: number;
    serverState: ServerState | null;
    playerCount: number;
}

export interface LockFundsAPIRequest {
    playerId: string,
    amount: number,
    gameId: string,
    lock : boolean,
    addTxnLog: boolean,
    gameEndReason : string | undefined,
}

export interface DebitFundsAPIRequest {
    playerId: string,
    amount: number,
    gameId: string
}

export interface RakeCreditAPIRequest {
    amount : number,
    gameId : string,
    playersIdAr : string[],
}

export enum GlobalPlayerState {
    IN_APP = 0,
    IN_LUDO = 1,
    IN_RUMMY = 2,
    IN_POKER = 3,
}

export interface PlayerStatusAPIRequest {
    userId : number,
    state : number,
    serverAddress : string,
    tableType : number,
    entryFee : number
}

export interface CreditFundsAPIRequest {
    playerId: string,
    amount: number,
    gameId: string
}

export interface APIResponse<T>{
    isErr: boolean;
    status: number;
    message: string;
    data: T;
}

export enum  ServerState {
    ONLINE = 0,
    IN_GAME = 1,
    MATCHMAKING = 2,
    RESERVED = 3
}



