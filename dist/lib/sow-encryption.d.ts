/*
* Copyright (c) 2018, SOW ( https://safeonline.world, https://www.facebook.com/safeonlineworld). (https://github.com/safeonlineworld/cwserver) All rights reserved.
* Copyrights licensed under the New BSD License.
* See the accompanying LICENSE file for terms.
*/
export interface ICryptoInfo {
    oldKey: string;
    md5?: string;
    key: any;
    iv: any;
}
export declare function md5( contents: string ): string;
export declare class CryptoInfo implements ICryptoInfo {
    oldKey: string;
    md5?: string;
    key: any;
    iv: any;
    constructor();
}
export declare namespace Encryption {
    function utf8ToHex( str: string ): string;
    function hexToUtf8( str: string ): string;
    function toMd5( str: string ): string;
    function updateCryptoKeyIV( key: string ): ICryptoInfo;
    function encrypt( plainText: string, inf: ICryptoInfo ): string;
    function decrypt( encryptedText: string, inf: ICryptoInfo ): string;
    function encryptToHex( plainText: string, inf: ICryptoInfo ): string;
    function decryptFromHex( encryptedText: string, inf: ICryptoInfo ): string;
    function encryptUri( plainText: string, inf: ICryptoInfo ): string;
    function decryptUri( encryptedText: string, inf: ICryptoInfo ): string;
}