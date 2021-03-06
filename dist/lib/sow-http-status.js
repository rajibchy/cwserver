"use strict";
Object.defineProperty( exports, "__esModule", { value: true } );
exports.HttpStatus = exports.HttpStatusCode = void 0;
const sow_static_1 = require( "./sow-static" );
exports.HttpStatusCode = {
    continue: 100,
    switchingprotocols: 101,
    ok: 200,
    created: 201,
    accepted: 202,
    nonauthoritativeinformation: 203,
    nocontent: 204,
    resetcontent: 205,
    partialcontent: 206,
    multiplechoices: 300,
    ambiguous: 300,
    movedpermanently: 301,
    moved: 301,
    found: 302,
    redirect: 302,
    seeother: 303,
    redirectmethod: 303,
    notmodified: 304,
    useproxy: 305,
    unused: 306,
    temporaryredirect: 307,
    redirectkeepverb: 307,
    badrequest: 400,
    unauthorized: 401,
    paymentrequired: 402,
    forbidden: 403,
    notfound: 404,
    methodnotallowed: 405,
    notacceptable: 406,
    proxyauthenticationrequired: 407,
    requesttimeout: 408,
    conflict: 409,
    gone: 410,
    lengthrequired: 411,
    preconditionfailed: 412,
    requestentitytoolarge: 413,
    requesturitoolong: 414,
    unsupportedmediatype: 415,
    requestedrangenotsatisfiable: 416,
    expectationfailed: 417,
    upgraderequired: 426,
    internalservererror: 500,
    notimplemented: 501,
    badgateway: 502,
    serviceunavailable: 503,
    gatewaytimeout: 504,
    httpversionnotsupported: 505
};
const _group = {
    "1": {
        type: "Informational",
        error: false
    },
    "2": {
        type: "Success",
        error: false
    },
    "3": {
        type: "Redirection",
        error: false
    },
    "4": {
        type: "Client Error",
        error: true
    },
    "5": {
        type: "Server Error",
        error: true
    }
};
class HttpStatus {
    static get statusCode() { return exports.HttpStatusCode; }
    static getDescription( statusCode ) {
        for ( const description in exports.HttpStatusCode ) {
            if ( exports.HttpStatusCode[description] === statusCode )
                return description;
        }
        throw new Error( `Invalid ==> ${statusCode}...` );
    }
    static fromPath( path, statusCode ) {
        const outStatusCode = statusCode;
        let index = path.lastIndexOf( "/" );
        if ( index < 0 )
            index = path.lastIndexOf( "\\" );
        if ( index < 0 )
            return outStatusCode;
        const file = path.substring( index + 1 );
        index = file.lastIndexOf( "." );
        if ( index < 0 )
            return outStatusCode;
        const code = file.substring( 0, index );
        // check is valid server status code here...
        statusCode = sow_static_1.ToNumber( code );
        if ( statusCode === 0 )
            return outStatusCode;
        // if ( this.isValidCode( statusCode ) ) return outStatusCode;
        return statusCode;
    }
    static isValidCode( statusCode ) {
        for ( const name in exports.HttpStatusCode ) {
            if ( exports.HttpStatusCode[name] === statusCode )
                return true;
        }
        return false;
    }
    static getResInfo( path, code ) {
        code = sow_static_1.ToNumber( code );
        const out = new sow_static_1.ResInfo();
        out.code = this.fromPath( path, code );
        out.isValid = false;
        out.isErrorCode = false;
        out.isInternalErrorCode = false;
        out.tryServer = false;
        if ( out.code > 0 ) {
            out.isValid = this.isValidCode( out.code );
        }
        else {
            out.isValid = false;
        }
        if ( out.isValid )
            out.isErrorCode = this.isErrorCode( out.code );
        if ( out.isErrorCode )
            out.isInternalErrorCode = out.code === 500;
        return out;
    }
    static isErrorCode( code ) {
        const inf = _group[String( code ).charAt( 0 )];
        if ( !inf )
            throw new Error( `Invalid http status code ${code}...` );
        return inf.error;
    }
}
exports.HttpStatus = HttpStatus;
//# sourceMappingURL=sow-http-status.js.map