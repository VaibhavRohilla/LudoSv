"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerState = exports.GlobalPlayerState = void 0;
var GlobalPlayerState;
(function (GlobalPlayerState) {
    GlobalPlayerState[GlobalPlayerState["IN_APP"] = 0] = "IN_APP";
    GlobalPlayerState[GlobalPlayerState["IN_LUDO"] = 1] = "IN_LUDO";
    GlobalPlayerState[GlobalPlayerState["IN_RUMMY"] = 2] = "IN_RUMMY";
    GlobalPlayerState[GlobalPlayerState["IN_POKER"] = 3] = "IN_POKER";
})(GlobalPlayerState = exports.GlobalPlayerState || (exports.GlobalPlayerState = {}));
var ServerState;
(function (ServerState) {
    ServerState[ServerState["ONLINE"] = 0] = "ONLINE";
    ServerState[ServerState["IN_GAME"] = 1] = "IN_GAME";
    ServerState[ServerState["MATCHMAKING"] = 2] = "MATCHMAKING";
    ServerState[ServerState["RESERVED"] = 3] = "RESERVED";
})(ServerState = exports.ServerState || (exports.ServerState = {}));
//# sourceMappingURL=DataTypes.js.map