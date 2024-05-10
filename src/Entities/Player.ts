import { CONNECTING } from "ws";
import { DBCollectionNames, sendToAnalytics } from "../apicalls";
import { TableGameRoom } from "./TableGameRoom";
import { Token } from "./Token";
import { Money } from "./Money";
import { LogMessage } from "../LoggingHandler";
import { RemovePlayerEvent } from "./Utils";
import { TIMEOUT } from "dns";



export enum PLAYERSTATE {
    WAITING,
    ROLLDICE,
    SELECTTOKEN,
    ROLLED

}

export class Player {


    hasDeposited: boolean=false;

    assignTokens() {
    }
    plRoomNetId: number = -1;
    gRoom: TableGameRoom | null = null;

    score: number = 0;
    winAmount: Money = new Money(0);
    resultReason: string = "";

    balance: Money = new Money(0);

    removalEvent: RemovePlayerEvent | null = null;



    public sixRollStreak: number = 0
    private _state: PLAYERSTATE = PLAYERSTATE.WAITING;

    public get state(): PLAYERSTATE {
        return this._state;
    }
    public set state(value: PLAYERSTATE) {
        if (this.gRoom)
            LogMessage(`Player ${this.playerID} state changed ${PLAYERSTATE[value]}`, this.gRoom, this);

        this._state = value;
    }

    public updateRemovalEvent(event: RemovePlayerEvent): boolean {

        if (this.removalEvent == RemovePlayerEvent.TIMEOUT)
            return false;


        this.removalEvent = event;
        return true;
    }


    public lastMovableTokens: string[] = [];

    //public playerTokens: Token[] = [];
    public skippedTurns: number = 0;

    isDisconnected: boolean = false;

    treatAsDisconnectTimeout: NodeJS.Timeout | null = null;

    constructor(
        public plSocket: any,
        public tableGameID: string,
        public playerID: string,
        public plName: string,
        public profileImage: string

    ) {
    }

    //id of game session player is inside

    sendMessage(content: any, isBinary: boolean = false) {

        if (content.t == "timer" || content.t == "turnTimer") {

        } else {
            //  console.log("Sending to "+ this.plName +"----");
            //  console.log(content);
        }

        if (this.plSocket && this.plSocket.isConnectionAlive) {
            if (isBinary)
                this.plSocket.send(content);
            else {

                try {
                    this.plSocket.send(JSON.stringify(content));

                } catch
                {

                    // console.log("Error in sending message to player");
                    console.log(content);

                    sendToAnalytics({
                        collection: DBCollectionNames.UnexpectedErrors,
                        data: {
                            type: "SOCKET_NULL",
                            msg: "Error in sending message to player",
                            playerId: this.playerID,
                            tableGameId: this.tableGameID,
                            content: content,
                        }
                    });
                    // throw new Error("Error in sending message to player");
                }
            }
        }



        // if (this.plSocket) {
        //     if (isBinary)
        //         this.plSocket.send(content);
        //     else {
        //         this.plSocket.send(JSON.stringify(content));
        //     }
        // }
    }

    recievePing() {
        if (this.treatAsDisconnectTimeout)
            clearTimeout(this.treatAsDisconnectTimeout);

        this.treatAsDisconnectTimeout = setTimeout(() => {
            if (this.gRoom)
                LogMessage(`Marking Player ${this.playerID} is disconnected`, this.gRoom, this);
            else
                console.log(`Marking Player ${this.playerID} is disconnected`);
        }, 4000);

        this.sendMessage({ t: "pong" });
    }

    reset() {
        this.state = PLAYERSTATE.WAITING;
        this.skippedTurns = 0;
        this.score = 0;
        this.winAmount = new Money(0);
        this.balance = new Money(0);


    }

}
