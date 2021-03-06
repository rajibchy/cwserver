"use strict";
var __createBinding = ( this && this.__createBinding ) || ( Object.create ? ( function ( o, m, k, k2 ) {
    if ( k2 === undefined ) k2 = k;
    Object.defineProperty( o, k2, { enumerable: true, get: function () { return m[k]; } } );
} ) : ( function ( o, m, k, k2 ) {
    if ( k2 === undefined ) k2 = k;
    o[k2] = m[k];
} ) );
var __setModuleDefault = ( this && this.__setModuleDefault ) || ( Object.create ? ( function ( o, v ) {
    Object.defineProperty( o, "default", { enumerable: true, value: v } );
} ) : function ( o, v ) {
    o["default"] = v;
} );
var __importStar = ( this && this.__importStar ) || function ( mod ) {
    if ( mod && mod.__esModule ) return mod;
    var result = {};
    if ( mod != null ) for ( var k in mod ) if ( k !== "default" && Object.hasOwnProperty.call( mod, k ) ) __createBinding( result, mod, k );
    __setModuleDefault( result, mod );
    return result;
};
Object.defineProperty( exports, "__esModule", { value: true } );
exports.Util = void 0;
const _fs = __importStar( require( "fs" ) );
const _path = __importStar( require( "path" ) );
const _isPlainObject = ( obj ) => {
    if ( obj === null || obj === undefined )
        return false;
    return typeof ( obj ) === 'object' && Object.prototype.toString.call( obj ) === "[object Object]";
};
const _extend = ( destination, source ) => {
    if ( !_isPlainObject( destination ) || !_isPlainObject( source ) )
        throw new TypeError( `Invalid arguments defined. Arguments should be Object instance. destination type ${typeof ( destination )} and source type ${typeof ( source )}` );
    for ( const property in source ) {
        if ( property === "__proto__" || property === "constructor" )
            continue;
        if ( !destination.hasOwnProperty( property ) ) {
            destination[property] = source[property];
        }
        else {
            destination[property] = source[property];
        }
    }
    return destination;
};
const _deepExtend = ( destination, source ) => {
    if ( typeof ( source ) === "function" )
        source = source();
    if ( !_isPlainObject( destination ) || !_isPlainObject( source ) )
        throw new TypeError( `Invalid arguments defined. Arguments should be Object instance. destination type ${typeof ( destination )} and source type ${typeof ( source )}` );
    for ( const property in source ) {
        if ( property === "__proto__" || property === "constructor" )
            continue;
        if ( !destination.hasOwnProperty( property ) ) {
            destination[property] = void 0;
        }
        const s = source[property];
        const d = destination[property];
        if ( _isPlainObject( d ) && _isPlainObject( s ) ) {
            _deepExtend( d, s );
            continue;
        }
        destination[property] = source[property];
    }
    return destination;
};
( function ( Util ) {
    function guid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace( /[xy]/g, ( c ) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : ( r & 0x3 | 0x8 );
            return v.toString( 16 );
        } );
    }
    Util.guid = guid;
    function extend( destination, source, deep ) {
        if ( deep === true )
            return _deepExtend( destination, source );
        return _extend( destination, source );
    }
    Util.extend = extend;
    function clone( source ) {
        return _extend( {}, source );
    }
    Util.clone = clone;
    /** Checks whether the specified value is an object. true if the value is an object; false otherwise. */
    function isPlainObject( obj ) {
        return _isPlainObject( obj );
    }
    Util.isPlainObject = isPlainObject;
    /** Checks whether the specified value is an array object. true if the value is an array object; false otherwise. */
    function isArrayLike( obj ) {
        if ( obj === null || obj === undefined )
            return false;
        const result = Object.prototype.toString.call( obj );
        return result === "[object NodeList]" || result === "[object Array]" ? true : false;
    }
    Util.isArrayLike = isArrayLike;
    function isError( obj ) {
        return Object.prototype.toString.call( obj ) === "[object Error]";
    }
    Util.isError = isError;
    /** compair a stat.mtime > b stat.mtime */
    function compairFile( a, b ) {
        const astat = _fs.statSync( a );
        const bstat = _fs.statSync( b );
        if ( astat.mtime.getTime() > bstat.mtime.getTime() )
            return true;
        return false;
    }
    Util.compairFile = compairFile;
    function pipeOutputStream( absPath, ctx ) {
        let openenedFile = _fs.createReadStream( absPath );
        openenedFile.pipe( ctx.res );
        return ctx.res.on( 'close', () => {
            if ( openenedFile ) {
                openenedFile.unpipe( ctx.res );
                openenedFile.close();
                openenedFile = Object.create( null );
            }
            ctx.next( 200 );
        } ), void 0;
    }
    Util.pipeOutputStream = pipeOutputStream;
    function readJsonAsync( absPath ) {
        const jsonstr = _fs.readFileSync( absPath, "utf8" ).replace( /\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, "" ).replace( /^\s*$(?:\r\n?|\n)/gm, "" );
        try {
            return JSON.parse( jsonstr );
        }
        catch ( e ) {
            return void 0;
        }
    }
    Util.readJsonAsync = readJsonAsync;
    function copyFileSync( src, dest ) {
        let parse = _path.parse( src );
        if ( !parse.ext )
            throw new Error( "Source file path required...." );
        parse = _path.parse( dest );
        if ( !parse.ext )
            throw new Error( "Dest file path required...." );
        if ( !_fs.existsSync( src ) )
            throw new Error( `Source directory not found ${src}` );
        if ( _fs.existsSync( dest ) )
            _fs.unlinkSync( dest );
        _fs.copyFileSync( src, dest );
    }
    Util.copyFileSync = copyFileSync;
    function rmdirSync( path ) {
        if ( !_fs.existsSync( path ) )
            return;
        const stats = _fs.statSync( path );
        if ( stats.isDirectory() ) {
            _fs.readdirSync( path ).forEach( ( nextItem ) => {
                rmdirSync( _path.join( path, nextItem ) );
            } );
            _fs.rmdirSync( path );
        }
        else {
            _fs.unlinkSync( path );
        }
    }
    Util.rmdirSync = rmdirSync;
    function copySync( src, dest ) {
        if ( !_fs.existsSync( src ) )
            return;
        const stats = _fs.statSync( src );
        if ( stats.isDirectory() ) {
            if ( !_fs.existsSync( dest ) )
                _fs.mkdirSync( dest );
            _fs.readdirSync( src ).forEach( ( nextItem ) => {
                copySync( _path.join( src, nextItem ), _path.join( dest, nextItem ) );
            } );
        }
        else {
            _fs.copyFileSync( src, dest );
        }
    }
    Util.copySync = copySync;
    function isExists( path, next ) {
        const url = _path.resolve( path );
        if ( !_fs.existsSync( url ) ) {
            return next ? ( next( 404, true ), false ) : false;
        }
        return url;
    }
    Util.isExists = isExists;
    function mkdirSync( rootDir, targetDir ) {
        if ( rootDir.length === 0 )
            return false;
        let fullPath = "";
        let sep = "";
        if ( targetDir ) {
            if ( targetDir.charAt( 0 ) === '.' )
                throw new Error( "No need to defined start point...." );
            fullPath = _path.resolve( rootDir, targetDir );
            sep = "/";
        }
        else {
            fullPath = _path.resolve( rootDir );
            // so we've to start form drive:\
            targetDir = fullPath;
            sep = _path.sep;
            rootDir = _path.isAbsolute( targetDir ) ? sep : '';
        }
        if ( _fs.existsSync( fullPath ) ) {
            return _fs.statSync( fullPath ).isDirectory();
        }
        if ( _path.parse( fullPath ).ext )
            return false;
        targetDir.split( sep ).reduce( ( parentDir, childDir ) => {
            if ( !childDir )
                return parentDir;
            const curDir = _path.resolve( parentDir, childDir );
            if ( !_fs.existsSync( curDir ) ) {
                _fs.mkdirSync( curDir );
            }
            return curDir;
        }, rootDir );
        return _fs.existsSync( fullPath );
    }
    Util.mkdirSync = mkdirSync;
    function sendResponse( ctx, reqPath, contentType ) {
        const url = isExists( reqPath, ctx.next );
        if ( !url )
            return;
        ctx.res.writeHead( 200, { 'Content-Type': contentType || 'text/html; charset=UTF-8' } );
        return pipeOutputStream( String( url ), ctx );
    }
    Util.sendResponse = sendResponse;
    function getExtension( reqPath ) {
        const index = reqPath.lastIndexOf( "." );
        if ( index > 0 ) {
            return reqPath.substring( index + 1 ).toLowerCase();
        }
        return void 0;
    }
    Util.getExtension = getExtension;
} )( exports.Util || ( exports.Util = {} ) );
//# sourceMappingURL=sow-util.js.map