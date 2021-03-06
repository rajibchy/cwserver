/*
* Copyright (c) 2018, SOW ( https://safeonline.world, https://www.facebook.com/safeonlineworld). (https://github.com/safeonlineworld/cwserver) All rights reserved.
* Copyrights licensed under the New BSD License.
* See the accompanying LICENSE file for terms.
*/
import * as _fs from 'fs';
import * as _vm from 'vm';
import * as _zlib from 'zlib';
import * as _path from 'path';
import { Util } from './sow-util';
import { HttpStatus } from './sow-http-status';
import { IResInfo } from './sow-static';
import { IContext } from './sow-server';
type SendBoxNext = ( ctx: IContext, body: string, isCompressed?: boolean ) => void;
export type SendBox = ( ctx: IContext, next: SendBoxNext, isCompressed?: boolean ) => void;
interface IScriptTag {
    l: string;
    lre: RegExp;
    r: string;
    rre: RegExp;
    repre: RegExp;
}
interface IParserInfo {
    line: string;
    tag: string;
    isTagStart: boolean;
    isTagEnd: boolean;
    startTageName?: string;
    isLastTag: boolean;
}
interface ITag {
    script: IScriptTag;
    write: IScriptTag;
}
interface IScriptParser {
    tag: ITag;
    startTage( parserInfo: IParserInfo ): void;
    endTage( parserInfo: IParserInfo ): void;
}
class ParserInfo implements IParserInfo {
    public line: string;
    public tag: string;
    public isTagStart: boolean;
    public isTagEnd: boolean;
    public startTageName?: string;
    public isLastTag: boolean;
    constructor() {
        this.line = ""; this.tag = ""; this.isTagStart = false;
        this.isTagEnd = true; this.startTageName = void 0;
        this.isLastTag = false;
    }
}
class ScriptTag implements IScriptTag {
    public l: string;
    public lre: RegExp;
    public r: string;
    public rre: RegExp;
    public repre: RegExp;
    constructor(
        l: string, lre: RegExp, r: string,
        rre: RegExp, repre: RegExp ) {
        this.l = l; this.lre = lre; this.r = r;
        this.rre = rre; this.repre = repre;
    }
}
class Tag implements ITag {
    public script: IScriptTag;
    public write: IScriptTag;
    constructor() {
        this.script = new ScriptTag( '{%', /{%/g, '%}', /%}/g, /{=(.+?)=}/g );
        this.write = new ScriptTag( '{=', /{=/g, '=}', /=}/g, /{=(.+?)=}/g );
    }
}
class ScriptParser implements IScriptParser {
    tag: ITag;
    constructor() {
        this.tag = new Tag();
    }
    startTage( parserInfo: IParserInfo ): void {
        if ( parserInfo.line.indexOf( parserInfo.tag ) <= -1 ) {
            if ( parserInfo.isLastTag && parserInfo.isTagEnd  ) {
                parserInfo.line = parserInfo.line + "\x0f; __RSP += \x0f";
            }
            return;
        }
        parserInfo.isTagStart = true;
        switch ( parserInfo.tag ) {
            case this.tag.script.l: /*{%*/
                ( this.tag.script.rre.test( parserInfo.line ) === true
                    ? ( parserInfo.isTagEnd = true, parserInfo.isTagStart = false,
                        parserInfo.line = parserInfo.line.replace( this.tag.script.lre, "\x0f;" )
                            .replace( this.tag.script.rre, " __RSP += \x0f" ) )
                    : parserInfo.isTagEnd = false,
                    parserInfo.line = parserInfo.line.replace( this.tag.script.lre, "\x0f;\r\n" ).replace( /'/g, '\x0f' ) );
                break;
            case this.tag.write.l: /*{=*/
                ( this.tag.write.rre.test( parserInfo.line ) === true ?
                    ( parserInfo.isTagEnd = true, parserInfo.isTagStart = false,
                        parserInfo.line = parserInfo.line.replace( this.tag.write.repre, ( match ) => {
                            return !match ? '' : match.replace( /'/gi, '\x0f' );
                        } ).replace( this.tag.write.lre, "\x0f; __RSP +=" )
                            .replace( this.tag.write.rre, "; __RSP += \x0f" ) )
                    : parserInfo.isTagEnd = false,
                    parserInfo.line = parserInfo.line.replace( /'/gi, '\x0f' ).replace( this.tag.write.lre, "\x0f; __RSP +=" ) );
                break;
        }
        parserInfo.startTageName = ( !parserInfo.isTagEnd ? parserInfo.tag : void 0 );
        return;
    }
    endTage( parserInfo: IParserInfo ): void {
        if ( parserInfo.isTagStart === false && parserInfo.isTagEnd === true ) return;
        if ( parserInfo.isTagStart !== false && parserInfo.isTagEnd !== true ) {
            parserInfo.isTagStart = true;
            switch ( parserInfo.tag ) {
                case this.tag.script.r: /*%}*/
                    ( this.tag.script.rre.test( parserInfo.line ) === true ?
                        ( parserInfo.isTagEnd = true, parserInfo.isTagStart = false,
                            parserInfo.line = parserInfo.line.replace( this.tag.script.rre, " __RSP += \x0f" ) )
                        : parserInfo.isTagEnd = false );
                    break;
                case this.tag.write.r: /*=}*/
                    ( this.tag.write.rre.test( parserInfo.line ) === true ?
                        ( parserInfo.isTagEnd = true, parserInfo.isTagStart = false, parserInfo.line = parserInfo.line.replace( this.tag.write.rre, "; __RSP += \x0f" ) )
                        : parserInfo.isTagEnd = false );
                    break;
            }
            parserInfo.startTageName = ( !parserInfo.isTagEnd ? parserInfo.startTageName : void 0 );
        }
        return;
    }
}
class TemplateParser {
    private static implimentAttachment( appRoot: string, str: string ): string {
        if ( /#attach/gi.test( str ) === false ) return str;
        return str.replace( /#attach([\s\S]+?)\r\n/gi, ( match ) => {
            const path = match.replace( /#attach/gi, "" ).replace( /\r\n/gi, "" ).trim();
            const abspath = _path.resolve( `${appRoot}${path}` );
            if ( !_fs.existsSync( abspath ) ) {
                throw new Error( `Attachement ${path} not found...` )
            }
            return _fs.readFileSync( abspath, "utf8" ).replace( /^\uFEFF/, '' );
        } );
    }
    private static margeTemplate( match: string[], template: string, body: string ): string {
        for ( const key of match ) {
            const tmplArr = /<placeholder id=\"(.*)\">/gi.exec( key.trim() );
            if ( !tmplArr ) {
                throw new Error( `Invalid template format... ${key}` );
            }
            const tmplId = tmplArr[1];
            if ( !tmplId || ( tmplId && tmplId.trim().length === 0 ) ) {
                throw new Error( `Invalid template format... ${key}` );
            }
            let implStr: any = void 0;
            template = template.replace( new RegExp( `<impl-placeholder id="${tmplId}">.+?<\/impl-placeholder>`, "gi" ), ( m ) => {
                implStr = m.replace( /<impl-placeholder[^>]*>/gi, "" ).replace( /<\/impl-placeholder>/gi, "" );
                return implStr;
            } );
            body = body.replace( new RegExp( `<placeholder id="${tmplId}">.+?<\/placeholder>`, "gi" ), () => {
                return implStr;
            } );
        }
        return body;
    }
    private static implimentTemplateExtend( appRoot: string, str: string ): string {
        if ( /#extends/gi.test( str ) === false ) return str;
        const templats: string[] = [];
        do {
            const match: RegExpExecArray | null = /#extends([\s\S]+?)\r\n/gi.exec( str );
            if ( !match ) {
                // no more master template extends
                templats.push( str ); break;
            }
            const found: string | undefined = match[1];
            if ( !found || ( found && found.trim().length === 0 ) ) {
                throw new Error( "Invalid template format..." );
            }
            const path = found.replace( /#extends/gi, "" ).replace( /\r\n/gi, "" ).trim();
            const abspath = _path.resolve( `${appRoot}${path}` );
            if ( !_fs.existsSync( abspath ) ) {
                throw new Error( `Template ${path} not found...` );
            }
            templats.push( str.replace( match[0], "" ) );
            str = _fs.readFileSync( abspath, "utf8" ).replace( /^\uFEFF/, '' );
        } while ( true );
        let count: number = 0;
        let body: string = "";
        let parentTemplate: string = "";
        const startTag: RegExp = /<placeholder[^>]*>/gi;
        const rnRegx: RegExp = /\r\n/gi;
        let len: number = templats.length;
        do {
            len--;
            if ( count === 0 ) {
                parentTemplate = templats[len].replace( rnRegx, "8_r_n_gx_8" );
                body += parentTemplate; count++; continue;
            }
            const match: RegExpMatchArray | null = parentTemplate.match( startTag );
            if ( match === null || ( match && match.length === 0 ) ) {
                throw new Error( "Invalid master template... No placeholder tag found...." );
            }
            parentTemplate = templats[len].replace( rnRegx, "8_r_n_gx_8" );
            body = this.margeTemplate( match, parentTemplate, body );
        } while ( len > 0 );
        return body.replace( /8_r_n_gx_8/gi, "\r\n" );
    }
    public static parse( appRoot: string, str: string ): string {
        return this.implimentAttachment(
            appRoot,
            this.implimentTemplateExtend( appRoot, str )
        ).replace( /^\s*$(?:\r\n?|\n)/gm, "\n" );
    }
}
const _tw: { [x: string]: any } = {
    cache: {}
}
export function templateNext(
    ctx: IContext, next: SendBoxNext, isCompressed?: boolean
): void {
    throw new Error( "Method not implemented." );
}
export class TemplateCore {
    public static compile(
        str?: string, next?: ( str: string, isScript?: boolean ) => void
    ): SendBox {
        if ( !str ) {
            throw new Error("No script found to compile....");
        }
        const context: { [x: string]: SendBox; } = {
            thisNext: templateNext
        };
        const script = new _vm.Script( `thisNext = async function( ctx, next, isCompressed ){\nlet __RSP = "";\nctx.write = function( str ) { __RSP += str; }\ntry{\n ${str}\nreturn next( ctx, __RSP, isCompressed ), __RSP = void 0;\n\n}catch( ex ){\n ctx.server.addError(ctx, ex);\nreturn ctx.next(500);\n}\n};` );
        _vm.createContext( context );
        script.runInContext( context );
        if( next ) next(str, true);
        return context.thisNext;
    }
    private static parseScript( str: string ): string | undefined {
        str = str.replace( /^\s*$(?:\r\n?|\n)/gm, "\n" );
        const script = str.split( '\n' );
        let out = "";
        out = '/*__sow_template_script__*/';
        const scriptParser: IScriptParser = new ScriptParser();
        const parserInfo: IParserInfo = new ParserInfo();
        for ( parserInfo.line of script ) {
            out += "\n";
            if ( !parserInfo.line || ( parserInfo.line && parserInfo.line.trim().length === 0 ) ) {
                out += "\r\n__RSP += '';"; continue;
            }
            // parserInfo.line = parserInfo.line.replace( /^\s*|\s*$/g, ' ' );
            parserInfo.line = parserInfo.line.replace(/(?:\r\n|\r|\n)/g, '');
            if ( parserInfo.isTagEnd === true ) {
                parserInfo.line = "__RSP += \x0f" + parserInfo.line;
            }
            parserInfo.tag = scriptParser.tag.script.l;
            scriptParser.startTage( parserInfo );
            parserInfo.tag = scriptParser.tag.script.r;
            scriptParser.endTage( parserInfo );
            parserInfo.tag = scriptParser.tag.write.l;
            scriptParser.startTage( parserInfo );
            parserInfo.tag = scriptParser.tag.write.r;
            scriptParser.endTage( parserInfo );
            if ( parserInfo.isTagEnd === true ) {
                parserInfo.line = parserInfo.line.replace( /'/g, '\\x27' ).replace( /\x0f/g, "'" );
                out += parserInfo.line + "\\n';";
            } else {
                parserInfo.line = parserInfo.line.replace( /\x0f/g, "'" );
                out += parserInfo.line;
            }
        }
        out = out.replace( /__RSP \+\= '';/g, '' );
        return out.replace( /^\s*$(?:\r\n?|\n)/gm, "\n" );
    }
    private static isScript( str: string ): boolean {
        if ( /{%/gi.test( str ) === true
            || /{=/gi.test( str ) === true ) {
            return true;
        }
        return false;
    }
    public static isTemplate( str: string ): boolean {
        if ( /#attach/gi.test( str ) === true
            || /#extends/gi.test( str ) === true ) {
            return true;
        }
        return false;
    }
    public static isScriptTemplate( str: string ): boolean {
        const index = str.indexOf( "\n" );
        if ( index < 0 ) return false;
        return str.substring( 0, index ).indexOf( "__sow_template_script__" ) > -1;
    }
    public static run( appRoot: string, str: string, next?: ( str: string, isScript?: boolean ) => void ): string | SendBox {
        const isTemplate = this.isTemplate( str );
        if ( isTemplate ) {
            str = TemplateParser.parse( appRoot, str );
        }
        if ( this.isScript( str ) ) {
            return this.compile( this.parseScript( str ), next );
        }
        if ( isTemplate ) {
            if ( next ) next( str, false );
        }
        return str;
    }
}
class TemplateLink {
    private static processResponse( status: IResInfo ): SendBoxNext {
        return ( ctx: IContext, body: string, isCompressed?: boolean ): void => {
            ctx.res.set( 'Cache-Control', 'no-store' );
            if ( isCompressed && isCompressed === true ) {
                return _zlib.gzip( Buffer.from( body ), ( error: Error | null, buff: Buffer ) => {
                    if ( error ) {
                        ctx.server.addError( ctx, error );
                        return ctx.next( 500, true );
                    }
                    ctx.res.writeHead( status.code, {
                        'Content-Type': 'text/html',
                        'Content-Encoding': 'gzip',
                        'Content-Length': buff.length
                    } );
                    ctx.res.end( buff );
                    ctx.next( status.code, status.isErrorCode === false );
                } ), void 0;
            }
            ctx.res.writeHead( status.code, {
                'Content-Type': 'text/html',
                'Content-Length': Buffer.byteLength( body )
            } );
            return ctx.res.end( body ), ctx.next( status.code, status.isErrorCode === false );
        }
    }
    public static tryLive( ctx: IContext, path: string, status: IResInfo ): void {
        const url = Util.isExists( path, ctx.next );
        if ( !url ) return;
        const result = TemplateCore.run( ctx.server.getPublic(), _fs.readFileSync( String( url ), "utf8" ).replace( /^\uFEFF/, '' ) );
        if ( typeof ( result ) === "function" ) {
            return result( ctx, this.processResponse( status ), false );
        }
        ctx.res.set( 'Cache-Control', 'no-store' );
        // ctx.res.writeHead( status.code, { 'Content-Type': 'text/html' } );
        return ctx.res.asHTML( 200 ).end( result ), ctx.next( status.code, status.isErrorCode === false );
    }
    public static tryMemCache( ctx: IContext, path: string, status: IResInfo ): void {
        const key = path.replace( /\//gi, "_" ).replace( /\./gi, "_" );
        let cache = _tw.cache[key];
        if ( !cache ) {
            const url = Util.isExists( path, ctx.next );
            if ( !url ) return;
            cache = TemplateCore.run( ctx.server.getPublic(), _fs.readFileSync( String( url ), "utf8" ).replace( /^\uFEFF/, '' ) );
            _tw.cache[key] = cache;
        }
        if ( typeof ( cache ) === "function" ) {
            return cache( ctx, this.processResponse( status ) );
        }
        ctx.res.set( 'Cache-Control', 'no-store' );
        ctx.res.writeHead( status.code, { 'Content-Type': 'text/html' } );
        return ctx.res.end( cache ), ctx.next( status.code, status.isErrorCode === false );
    }
    public static tryFileCacheOrLive( ctx: IContext, path: string, status: IResInfo ): void {
        const fsp = Util.isExists( path, ctx.next );
        if ( !fsp ) {
            return void 0;
        };
        const filePath = String( fsp );
        const cachePath = `${filePath}.cach`;
        if ( !filePath ) return;
        let readCache = false;
        if ( ctx.server.config.template.cache && Util.isExists( cachePath ) ) {
            readCache = Util.compairFile( filePath, cachePath ) === false;
            if ( readCache === false ) {
                _fs.unlinkSync( cachePath );
            }
        }
        let cache;
        if ( !readCache ) {
            cache = TemplateCore.run( ctx.server.getPublic(), _fs.readFileSync( filePath, "utf8" ).replace( /^\uFEFF/, '' ), !ctx.server.config.template.cache ? void 0 : ( str ) => {
                _fs.writeFileSync( cachePath, str );
            } );
        } else {
            cache = _fs.readFileSync( cachePath, "utf8" ).replace( /^\uFEFF/, '' );
            if ( TemplateCore.isScriptTemplate( cache ) ) {
                cache = TemplateCore.compile( cache );
            }
        }
        if ( typeof ( cache ) === "function" ) {
            return cache( ctx, this.processResponse( status ) );
        }
        ctx.res.set( 'Cache-Control', 'no-store' );// res.setHeader( 'Cache-Control', 'public, max-age=0' )
        ctx.res.writeHead( status.code, { 'Content-Type': 'text/html' } );
        return ctx.res.end( cache ), ctx.next( status.code, status.isErrorCode === false );
    }
}
export namespace Template {
    export function parse( ctx: IContext, path: string, status?: IResInfo ): void {
        if ( !status ) status = HttpStatus.getResInfo( path, 200 );
        try {
            ctx.servedFrom = ctx.server.pathToUrl( path );
            if ( !ctx.server.config.template.cache ) {
                return TemplateLink.tryLive( ctx, path, status );
            }
            if ( ctx.server.config.template.cache && ctx.server.config.template.cacheType === "MEM" ) {
                return TemplateLink.tryMemCache( ctx, path, status );
            }
            return TemplateLink.tryFileCacheOrLive( ctx, path, status );
        } catch ( ex ) {
            ctx.path = path;
            if ( status.code === 500 ) {
                if ( status.tryServer === true ) {
                    ctx.server.addError( ctx, ex );
                    return ctx.server.passError( ctx ), void 0;
                }
                status.tryServer = true;
            }
            ctx.server.log.error( `Send 500 ${ctx.server.pathToUrl( ctx.path )}` ).reset();
            status.code = 500; status.isErrorCode = true;
            return parse(
                ctx.server.addError( ctx, ex ),
                status.tryServer ? `${ctx.server.errorPage["500"]}` : `${ctx.server.config.errorPage["500"]}`,
                status
            );
        }
    }
}