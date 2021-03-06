/*
* Copyright (c) 2018, SOW ( https://safeonline.world, https://www.facebook.com/safeonlineworld). (https://github.com/safeonlineworld/cwserver) All rights reserved.
* Copyrights licensed under the New BSD License.
* See the accompanying LICENSE file for terms.
*/
import { IContext } from './sow-server';
import * as _fs from 'fs';
import * as _path from  'path';
const _isPlainObject = ( obj: any ): obj is { [x: string]: any; } => {
    if ( obj === null || obj === undefined ) return false;
    return typeof ( obj ) === 'object' && Object.prototype.toString.call( obj ) === "[object Object]";
}
const _extend = ( destination: any, source: any ): { [x: string]: any; } => {
    if ( !_isPlainObject( destination ) || !_isPlainObject( source ) )
        throw new TypeError( `Invalid arguments defined. Arguments should be Object instance. destination type ${typeof ( destination )} and source type ${typeof ( source )}` );
    for ( const property in source ) {
        if ( property === "__proto__" || property === "constructor" ) continue;
        if ( !destination.hasOwnProperty( property ) ) {
            destination[property] = source[property];
        } else {
            destination[property] = source[property];
        }
    }
    return destination;
}
const _deepExtend = ( destination: any, source: any ): { [x: string]: any; } => {
    if ( typeof ( source ) === "function" ) source = source();
    if ( !_isPlainObject( destination ) || !_isPlainObject( source ) )
        throw new TypeError( `Invalid arguments defined. Arguments should be Object instance. destination type ${typeof ( destination )} and source type ${typeof ( source )}` );
    for ( const property in source ) {
        if ( property === "__proto__" || property === "constructor" ) continue;
        if ( !destination.hasOwnProperty( property ) ) {
            destination[property] = void 0;
        }
        const s = source[property];
        const d = destination[property];
        if ( _isPlainObject( d ) && _isPlainObject( s ) ) {
            _deepExtend( d, s ); continue;
        }
        destination[property] = source[property];
    }
    return destination;
}
export namespace Util {
    export function guid(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace( /[xy]/g, ( c: string ) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : ( r & 0x3 | 0x8 );
            return v.toString( 16 );
        } );
    }
    export function extend( destination: any, source: any, deep?: boolean ): { [x: string]: any; } {
        if ( deep === true )
            return _deepExtend( destination, source );
        return _extend( destination, source );
    }
    export function clone( source: { [x: string]: any; } ) {
        return _extend( {}, source );
    }
    /** Checks whether the specified value is an object. true if the value is an object; false otherwise. */
    export function isPlainObject( obj?: any ): obj is { [x: string]: any; } {
        return _isPlainObject( obj );
    }
    /** Checks whether the specified value is an array object. true if the value is an array object; false otherwise. */
    export function isArrayLike( obj?: any ): obj is [] {
        if ( obj === null || obj === undefined ) return false;
        const result = Object.prototype.toString.call( obj );
        return result === "[object NodeList]" || result === "[object Array]" ? true : false;
    }
    export function isError( obj: any ): obj is Error {
        return Object.prototype.toString.call( obj ) === "[object Error]";
    }
    /** compair a stat.mtime > b stat.mtime */
    export function compairFile( a: string, b: string ): boolean {
        const astat = _fs.statSync( a );
        const bstat = _fs.statSync( b );
        if ( astat.mtime.getTime() > bstat.mtime.getTime() ) return true;
        return false;
    }
    export function pipeOutputStream( absPath: string, ctx: IContext ): void {
        let openenedFile: _fs.ReadStream = _fs.createReadStream( absPath );
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
    export function readJsonAsync( absPath: string ): { [id: string]: any } | void {
        const jsonstr = _fs.readFileSync( absPath, "utf8" ).replace( /\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, "" ).replace( /^\s*$(?:\r\n?|\n)/gm, "" );
        try {
            return JSON.parse( jsonstr );
        } catch ( e ) {
            return void 0;
        }
    }
    export function copyFileSync( src: string, dest: string ): void {
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
    export function rmdirSync( path: string ): void {
        if ( !_fs.existsSync( path ) ) return;
        const stats: _fs.Stats = _fs.statSync( path );
        if ( stats.isDirectory() ) {
            _fs.readdirSync( path ).forEach( ( nextItem: string ) => {
                rmdirSync(
                    _path.join( path, nextItem )
                );
            } );
            _fs.rmdirSync( path );
        } else {
            _fs.unlinkSync( path );
        }
    }
    export function copySync( src: string, dest: string ): void {
        if ( !_fs.existsSync( src ) ) return;
        const stats: _fs.Stats = _fs.statSync( src );
        if ( stats.isDirectory() ) {
            if ( !_fs.existsSync( dest ) )
                _fs.mkdirSync( dest );
            _fs.readdirSync( src ).forEach( ( nextItem: string ) => {
                copySync(
                    _path.join( src, nextItem ),
                    _path.join( dest, nextItem )
                );
            } );
        } else {
            _fs.copyFileSync( src, dest );
        }
    }
    export function isExists( path: string, next?: ( code?: number | undefined, transfer?: boolean ) => void ): string | boolean {
        const url = _path.resolve( path );
        if ( !_fs.existsSync( url ) ) {
            return next ? ( next( 404, true ), false ) : false;
        }
        return url;
    }
    export function mkdirSync( rootDir: string, targetDir?: string ): boolean {
        if ( rootDir.length === 0 ) return false;
        let fullPath: string = "";
        let sep: string = "";
        if ( targetDir ) {
            if ( targetDir.charAt( 0 ) === '.' ) throw new Error( "No need to defined start point...." );
            fullPath = _path.resolve( rootDir, targetDir );
            sep = "/";
        } else {
            fullPath = _path.resolve( rootDir );
            // so we've to start form drive:\
            targetDir = fullPath;
            sep = _path.sep;
            rootDir = _path.isAbsolute( targetDir ) ? sep : '';
        }
        if ( _fs.existsSync( fullPath ) ) {
            return _fs.statSync( fullPath ).isDirectory();
        }
        if ( _path.parse( fullPath ).ext ) return false;
        targetDir.split( sep ).reduce( ( parentDir, childDir ) => {
            if ( !childDir ) return parentDir;
            const curDir = _path.resolve( parentDir, childDir );
            if ( !_fs.existsSync( curDir ) ) {
                _fs.mkdirSync( curDir );
            }
            return curDir;
        }, rootDir );
        return _fs.existsSync( fullPath );
    }
    export function sendResponse(
        ctx: IContext, reqPath: string, contentType?: string
    ): void {
        const url = isExists( reqPath, ctx.next );
        if ( !url ) return;
        ctx.res.writeHead( 200, { 'Content-Type': contentType || 'text/html; charset=UTF-8' } );
        return pipeOutputStream( String( url ), ctx );
    }
    export function getExtension( reqPath: string ): string | void {
        const index = reqPath.lastIndexOf( "." );
        if ( index > 0 ) {
            return reqPath.substring( index + 1 ).toLowerCase();
        }
        return void 0;
    }
}