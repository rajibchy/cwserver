"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initView = exports.shouldBeError = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const socket_client_1 = require("./socket-client");
const index_1 = require("../index");
const mimeHandler = new index_1.HttpMimeHandler();
function shouldBeError(next) {
    try {
        next();
    }
    catch (e) {
        return e;
    }
}
exports.shouldBeError = shouldBeError;
;
let untouchedConfig = {};
function initView() {
    global.sow.server.registerView((app, controller, server) => {
        untouchedConfig = index_1.Util.clone(server.config);
        app.use("/app-error", (req, res, next) => {
            throw new Error("Application should be fire Error event");
        });
        const ws = index_1.socketInitilizer(server, socket_client_1.SocketClient());
        ws.create(require("socket.io"));
        const tempDir = server.mapPath("/upload/temp/");
        const vDir = path.join(path.resolve(server.getRoot(), '..'), "/project_template/test/");
        server.addVirtualDir("/vtest", vDir, (ctx) => {
            if (!mimeHandler.isValidExtension(ctx.extension))
                return ctx.next(404);
            mimeHandler.getMimeType(ctx.extension);
            return mimeHandler.render(ctx, vDir, true);
        });
        const streamDir = path.join(path.resolve(server.getRoot(), '..'), "/project_template/test/");
        server.addVirtualDir("/web-stream", streamDir, (ctx) => {
            if (ctx.server.config.liveStream.indexOf(ctx.extension) > -1) {
                const absPath = path.resolve(`${streamDir}/${ctx.path}`);
                if (!index_1.Util.isExists(absPath, ctx.next))
                    return;
                const mimeType = mimeHandler.getMimeType(ctx.extension);
                return index_1.Streamer.stream(ctx, absPath, mimeType, fs.statSync(absPath));
            }
            return ctx.next(404);
        });
        controller
            .get('/ws-server-event', (ctx) => {
            ctx.res.json(ws.wsEvent);
            ctx.next(200);
            return void 0;
        })
            .any('/echo', (ctx) => {
            ctx.res.writeHead(200, {
                "Content-Type": ctx.req.headers["content-type"] || "text/plain"
            });
            ctx.req.pipe(ctx.res);
            return void 0;
        })
            .any('/response', (ctx) => {
            if (ctx.req.method === "GET") {
                if (ctx.req.query.task === "gzip") {
                    const data = ctx.req.query.data;
                    return ctx.res.json(typeof (data) === "string" ? JSON.parse(data) : data, true, (err) => {
                        ctx.server.addError(ctx, err || "");
                        ctx.next(500);
                    }), void 0;
                }
            }
            return ctx.next(404);
        })
            .post('/upload', (ctx) => {
            const parser = new index_1.PayloadParser(ctx.req, tempDir);
            parser.readData((err) => {
                if (err) {
                    if (typeof (err) === "string" && err === "CLIENET_DISCONNECTED")
                        return ctx.next(-500);
                    parser.clear();
                    server.addError(ctx, err instanceof Error ? err.message : err);
                    return ctx.next(500);
                }
                if (!parser.isMultipart()) {
                    ctx.next(404);
                }
                else {
                    const data = [];
                    parser.getFiles((file) => {
                        data.push({
                            content_type: file.getContentType(),
                            name: file.getName(),
                            file_name: file.getFileName(),
                            content_disposition: file.getContentDisposition(),
                            file_size: file.getFileSize()
                        });
                    });
                    ctx.res.json(data.shift() || {});
                    ctx.next(200);
                }
                parser.clear();
            });
        })
            .get('/is-authenticate', (ctx) => {
            if (!ctx.req.query.loginId)
                return ctx.next(401);
            if (ctx.session.loginId !== ctx.req.query.loginId)
                return ctx.next(401);
            ctx.res.json(ctx.session);
            return ctx.next(200);
        })
            .any('/redirect', (ctx) => {
            return ctx.res.status(301).redirect("/"), ctx.next(301, false);
        })
            .get('/authenticate', (ctx) => {
            if (!ctx.req.query.loginId) {
                if (!ctx.req.session.isAuthenticated)
                    return ctx.next(401);
                return ctx.res.status(301).redirect("/"), ctx.next(301, false);
            }
            const loginID = ctx.req.query.loginId.toString();
            const result = {
                code: 200,
                data: {
                    token: "",
                    hash: "",
                    userInfo: {
                        loginId: ""
                    },
                    error: false
                }
            };
            if (ctx.req.session.isAuthenticated) {
                result.data.hash = index_1.Encryption.toMd5(ctx.req.session.loginId);
                result.data.userInfo.loginId = ctx.req.session.loginId;
            }
            else {
                // server.db.query()
                // perform pgsql here with this incomming token
                result.data.token = index_1.Util.guid();
                result.data.hash = index_1.Encryption.toMd5(loginID);
                result.data.userInfo.loginId = loginID;
                result.data.error = false;
                // res, loginId, roleId, userData
                server.setSession(ctx, /*loginId*/ loginID, /*roleId*/ "Admin", /*userData*/ { token: result.data.token });
            }
            ctx.res.writeHead(result.code, { 'Content-Type': 'application/json' });
            ctx.res.end(JSON.stringify(result.data));
            ctx.next(200);
        })
            .post('/post', (ctx) => {
            const parser = new index_1.PayloadParser(ctx.req, tempDir);
            parser.readData((err) => {
                if (parser.isUrlEncoded() || parser.isAppJson()) {
                    ctx.res.writeHead(200, { 'Content-Type': 'application/json' });
                    return ctx.res.end(JSON.stringify(parser.getJson())), ctx.next(200), void 0;
                }
                return ctx.next(404);
            });
        });
    });
}
exports.initView = initView;