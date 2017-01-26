export declare class Utils {
    static isPromise(item: any): boolean;
    static isNotSet(input: any): boolean;
    static isMap(input: any): boolean;
    static isSet(input: any): boolean;
    static isFunction(value: any): boolean;
    static isObject(input: any): boolean;
    static isHostObject(value: any): boolean;
    static overArg(func: any, transform: any): (arg: any) => any;
    static isObjectLike(value: any): boolean;
    static flatten(data: any): any;
    static setHiddenProperty(obj: Object, key: string, value: Object): any;
    static isString(value: any): boolean;
    static isArray(input: any): boolean;
    static isPlainObject(value: any): boolean;
    static getParameterNamesFromFunction(func: any): any;
}
