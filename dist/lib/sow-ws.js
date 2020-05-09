"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sow_encryption_1 = require("./sow-encryption");
const socket_io_1 = __importDefault(require("socket.io"));
const sow_util_1 = require("./sow-util");
class WsClientInfo {
    constructor() {
        this.client = (me, session, sowSocket, server) => {
            throw new Error("Method not implemented.");
        };
        this.next = (session, socket) => {
            throw new Error("Method not implemented.");
        };
    }
    getServerEvent() {
        throw new Error("Method not implemented.");
    }
}
exports.WsClientInfo = WsClientInfo;
class SowSocketInfo {
    constructor() {
        this.token = "";
        this.socketId = "";
        this.isOwner = false;
        this.isAuthenticated = false;
        this.isReconnectd = false;
    }
    getSocket() {
        throw new Error("Method not implemented.");
    }
    sendMsg(method, data) {
        throw new Error("Method not implemented.");
    }
}
exports.SowSocketInfo = SowSocketInfo;
class SowSocket {
    constructor(server, wsClientInfo) {
        if (!server.config.socketPath) {
            throw new Error("Socket Path should not left blank...");
        }
        this.implimented = false;
        this.socket = [];
        this.connected = false;
        this._server = server;
        this._wsClientInfo = wsClientInfo;
    }
    isActiveSocket(token) {
        return this.socket.some((a) => { return a.token === token; });
    }
    getOwners(group) {
        return group ? this.socket.filter(soc => soc.isOwner === true && soc.group === group) : this.socket.filter(soc => soc.isOwner === true);
    }
    findByHash(hash) {
        return this.socket.filter(soc => soc.hash === hash);
    }
    findByLogin(loginId) {
        return this.socket.filter(soc => soc.loginId === loginId);
    }
    toList(sockets) {
        const list = [];
        if (!sockets)
            return list;
        sockets.forEach(a => {
            list.push({
                token: a.token, hash: a.hash, loginId: a.loginId
            });
        });
        return list;
    }
    getClientByExceptHash(exceptHash, group) {
        return !group ? this.socket.filter(soc => soc.hash !== exceptHash) : this.socket.filter(soc => soc.hash !== exceptHash && soc.group === group);
    }
    getClientByExceptLogin(exceptLoginId, group) {
        return !group ? this.socket.filter(soc => soc.loginId !== exceptLoginId) : this.socket.filter(soc => soc.loginId !== exceptLoginId && soc.group === group);
    }
    getClient(token, group) {
        return !group ? this.socket.filter(soc => soc.token !== token) : this.socket.filter(soc => soc.token !== token && soc.group === group);
    }
    getSocket(token) {
        return this.socket.find(soc => soc.token === token);
    }
    removeSocket(token) {
        let index = -1;
        this.socket.find((soc, i) => {
            return (soc.token === token ? (index = i, true) : false);
        });
        if (index < 0)
            return false;
        this.socket.splice(index, 1);
        return true;
    }
    sendMsg(token, method, data) {
        const soc = this.getSocket(token);
        if (!soc)
            return false;
        return soc.sendMsg(method, data), true;
    }
    create() {
        if (this.implimented)
            return void 0;
        this.implimented = true;
        const io = socket_io_1.default(this._server.getHttpServer(), {
            path: this._server.config.socketPath,
            pingTimeout: (1000 * 5),
            cookie: true
        });
        io.use((socket, next) => {
            if (!socket.request.session) {
                socket.request.session = this._server.parseSession(socket.request.headers.cookie);
            }
            if (!this._wsClientInfo.next(socket.request.session, socket))
                return void 0;
            return next();
        });
        this._server.log.success(`Socket created...`);
        return io.on("connect", (socket) => {
            this.connected = socket.connected;
        }).on('connection', (socket) => {
            if (!socket.request.session) {
                socket.request.session = this._server.parseSession(socket.handshake.headers.cookie);
                if (!this._wsClientInfo.next(socket.request.session, socket))
                    return void 0;
            }
            const _me = (() => {
                const token = sow_util_1.Util.guid();
                this.socket.push({
                    token,
                    loginId: socket.request.session.loginId,
                    hash: socket.request.session.isAuthenticated ? sow_encryption_1.Encryption.toMd5(socket.request.session.loginId) : void 0,
                    socketId: socket.id,
                    isAuthenticated: socket.request.session.isAuthenticated,
                    isOwner: false,
                    group: void 0,
                    isReconnectd: false,
                    getSocket: () => { return socket; },
                    sendMsg: (method, data) => {
                        if (!socket)
                            return this;
                        return socket.emit(method, data), this;
                    },
                });
                const socketInfo = this.getSocket(token);
                if (!socketInfo)
                    throw new Error("Should not here...");
                return socketInfo;
            })();
            this._server.log.success(`New Socket connected... Token# ${_me.token}`);
            socket.on('disconnect', () => {
                if (!this.removeSocket(_me.token))
                    return;
                socket.broadcast.emit("on-disconnect-user", {
                    token: _me.token, hash: _me.hash, loginId: _me.loginId
                });
                this._server.log.info(`User disconnected==>${_me.token}`);
                return void 0;
            });
            const client = this._wsClientInfo.client(_me, socket.request.session, this, this._server);
            for (const method in client) {
                socket.on(method, client[method]);
            }
            _me.sendMsg(_me.isReconnectd ? "on-re-connected" : "on-connected", {
                token: _me.token, hash: _me.hash, loginId: _me.loginId
            });
            socket.broadcast.emit("update-user-list", {
                users: [{
                        token: _me.token, hash: _me.hash, loginId: _me.loginId
                    }]
            });
            socket.emit("update-user-list", {
                users: this.toList(this.getClient(_me.token))
            });
            if (_me.isReconnectd && _me.group) {
                this._server.log.info("Re-connected...");
                this.getClient(_me.token, _me.group).forEach(soc => {
                    soc.sendMsg("on-re-connected-client", {
                        socket: _me.token
                    });
                });
            }
            return void 0;
        }), void 0;
    }
}
exports.SowSocket = SowSocket;
function SoketInitilizer(server, wsClientInfo) {
    if (typeof (wsClientInfo.getServerEvent) !== "function") {
        throw new Error("Invalid IWsClientInfo...");
    }
    if (typeof (wsClientInfo.next) !== "function") {
        wsClientInfo.next = (session, socket) => {
            return true;
        };
    }
    const _ws_event = wsClientInfo.getServerEvent();
    const _ws = new SowSocket(server, wsClientInfo);
    return {
        get isConnectd() {
            return _ws.implimented;
        },
        get wsEvent() {
            return _ws_event;
        },
        create() {
            if (_ws.implimented)
                return;
            return _ws.create();
        }
    };
}
exports.SoketInitilizer = SoketInitilizer;
//# sourceMappingURL=sow-ws.js.map