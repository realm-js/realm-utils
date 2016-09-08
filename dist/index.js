(function(___env___){
/* ****** Setup ****** */
var __scope__ = ___env___.scope;
var $isBackend = ___env___.isBackend;
var __ts__ = ___env___.ts;


/* ******* utils.ts ******* */
__ts__.module("utils.js", function(exports, require){
"use strict";
const funcProto = Function.prototype;
const objectProto = Object.prototype;
const funcToString = funcProto.toString;
const hasOwnProperty = objectProto.hasOwnProperty;
const objectCtorString = funcToString.call(Object);
const objectToString = objectProto.toString;
const objectTag = '[object Object]';
const funcTag = '[object Function]';
const funcTag2 = '[Function]';
const genTag = '[object GeneratorFunction]';
class Utils {
    static isPromise(item) {
        return item !== undefined
            && typeof item.then === 'function' &&
            typeof item.catch === 'function';
    }
    static isNotSet(input) {
        return input === undefined || input === null;
    }
    static isFunction(value) {
        var tag = this.isObject(value) ? objectToString.call(value) : '';
        return tag === funcTag2 || tag == funcTag || tag == genTag;
    }
    static isObject(input) {
        var type = typeof input;
        return !!input && (type == 'object' || type == 'function');
    }
    static isHostObject(value) {
        var result = false;
        if (value != null && typeof value.toString != 'function') {
            try {
                result = !!(value + '');
            }
            catch (e) { }
        }
        return result;
    }
    static overArg(func, transform) {
        return function (arg) {
            return func(transform(arg));
        };
    }
    static isObjectLike(value) {
        return !!value && typeof value == 'object';
    }
    static flatten(data) {
        return [].concat.apply([], data);
    }
    static setHiddenProperty(obj, key, value) {
        Object.defineProperty(obj, key, {
            enumerable: false,
            value: value
        });
        return value;
    }
    static isString(value) {
        return typeof value === 'string';
    }
    static isArray(input) {
        return Array.isArray(input);
    }
    static isPlainObject(value) {
        if (!this.isObjectLike(value) ||
            objectToString.call(value) != objectTag || this.isHostObject(value)) {
            return false;
        }
        var proto = this.overArg(Object.getPrototypeOf, Object)(value);
        if (proto === null) {
            return true;
        }
        var Ctor = hasOwnProperty.call(proto, 'constructor') && proto.constructor;
        return (typeof Ctor == 'function' &&
            Ctor instanceof Ctor && funcToString.call(Ctor) == objectCtorString);
    }
    static getParameterNamesFromFunction(func) {
        var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
        var ARGUMENT_NAMES = /([^\s,]+)/g;
        var fnStr = func.toString().replace(STRIP_COMMENTS, '');
        var result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
        if (result === null)
            result = [];
        return result;
    }
}
exports.Utils = Utils;

});

/* ******* each.ts ******* */
__ts__.module("each.js", function(exports, require){
"use strict";
const utils_1 = require('./utils');
exports.Each = (argv, cb) => {
    return new Promise((resolve, reject) => {
        const results = [];
        const isObject = utils_1.Utils.isPlainObject(argv);
        let index = -1;
        let iterate = () => {
            index++;
            if (index < argv.length) {
                let key = isObject ? Object.keys(argv)[index] : index;
                let value = isObject ? argv[key] : argv[index];
                if (utils_1.Utils.isPromise(value)) {
                    value.then(data => { results.push(data); iterate(); }).catch(reject);
                }
                else {
                    let res = cb(...[value, key]);
                    if (utils_1.Utils.isPromise(res)) {
                        res.then((a) => {
                            results.push(a);
                            iterate();
                        }).catch(reject);
                    }
                    else {
                        results.push(res);
                        iterate();
                    }
                }
            }
            else
                return resolve(results);
        };
        return iterate();
    });
};

});

/* ******* chain.ts ******* */
__ts__.module("chain.js", function(exports, require){
"use strict";
const utils_1 = require('./utils');
const each_1 = require('./each');
class Chainable {
    constructor() {
        this.$finalized = false;
        this.$killed = false;
        this.$collection = {};
    }
    break(manual) {
        this.$finalized = true;
        this.$manual = manual;
    }
    kill() {
        this.$finalized = true;
        this.$killed = true;
    }
}
exports.Chainable = Chainable;
let ChainClassContructor = (input) => {
    if (input instanceof Chainable) {
        return input;
    }
    let instance = {};
    if (utils_1.Utils.isFunction(input)) {
        instance = new input();
        if (instance instanceof Chainable) {
            return instance;
        }
    }
    else if (utils_1.Utils.isObject(input)) {
        instance = input;
    }
    else {
        throw new Error("Chain requires a Class or an Instance");
    }
    instance['$collection'] = {};
    instance['break'] = manual => {
        utils_1.Utils.setHiddenProperty(instance, '$finalized', true);
        utils_1.Utils.setHiddenProperty(instance, '$manual', manual);
    };
    instance['kill'] = () => {
        utils_1.Utils.setHiddenProperty(instance, '$finalized', true);
        utils_1.Utils.setHiddenProperty(instance, '$killed', true);
    };
    return instance;
};
exports.Chain = (cls) => {
    let instance = ChainClassContructor(cls);
    let props = Object.getOwnPropertyNames(instance.constructor.prototype);
    let tasks = [];
    for (var i = 1; i < props.length; i++) {
        let propertyName = props[i];
        if (!(propertyName in ["format", 'kill', 'break'])) {
            let isSetter = propertyName.match(/^set(.*)$/);
            let setterName = null;
            if (isSetter) {
                setterName = isSetter[1];
                setterName = setterName.charAt(0).toLowerCase() + setterName.slice(1);
            }
            tasks.push({
                prop: propertyName,
                setter: setterName,
            });
        }
    }
    let store = function (prop, val) {
        instance.$collection[prop] = val;
        instance[prop] = val;
    };
    let evaluate = function (task) {
        var result = instance[task.prop].apply(instance);
        if (task.setter) {
            if (utils_1.Utils.isPromise(result)) {
                return result.then(res => { store(task.setter, res); });
            }
            else
                store(task.setter, result);
        }
        return result;
    };
    return each_1.Each(tasks, (task) => {
        return !instance.$finalized ? evaluate(task) : false;
    }).then(() => {
        if (utils_1.Utils.isFunction(instance["format"])) {
            return evaluate({
                prop: "format"
            });
        }
    }).then(specialFormat => {
        if (instance.$killed)
            return;
        if (!instance.$manual) {
            if (specialFormat)
                return specialFormat;
            return instance.$collection;
        }
        else
            return instance.$manual;
    });
};

});

/* ******* index.ts ******* */
__ts__.module("index.js", function(exports, require){
"use strict";
var each_1 = require('./each');
exports.each = each_1.Each;
var chain_1 = require('./chain');
exports.chain = chain_1.Chain;
exports.Chainable = chain_1.Chainable;
var utils_1 = require('./utils');
exports.utils = utils_1.Utils;

});

__ts__.expose(__scope__, "index");})(function($scope, $isBackend) { var ts = {register: {},pathJoin: function() { var parts = []; for (var i = 0, l = arguments.length; i < l; i++) {parts = parts.concat(arguments[i].split("/")); } var newParts = []; for (i = 0, l = parts.length; i < l; i++) {var part = parts[i];if (!part || part === ".") { continue}if (part === "..") { newParts.pop();} else { newParts.push(part);} } if (parts[0] === "") {newParts.unshift("") } return newParts.join("/") || (newParts.length ? "/" : ".");},module: function(name, fn) { var _exports = {}; var relative = "./"; var rel = name.match(/^(.*)\/[\w]+\.js$/); if (rel) {relative = rel[1]; } fn(_exports, this.require.bind({self: this,path: name,relative: relative })); this.register[name] = _exports;},require: function(name) { var self = this.self; var path = this.path; var relative = this.relative; if (name[0] === ".") {var target = ts.pathJoin(relative, name) + ".js";if (self.register[target]) { return self.register[target];} } else {return require(name); }},expose: function(scope, path) { path = path.match(/\.js^/) ? path : path + ".js"; var e = this.register[path]; if (e !== undefined) {var useAmd = !$isBackend && typeof define == 'function' && define.amd;for (var key in e) { var value = e[key]; if (useAmd) {define(key, [], function() { return value;}); } else {$scope[key] = value }} } else {throw new Error('Module "' + path + '" Cannot be exposed! Make sure you export variables correctly and the module is present'); }} }; return {isBackend: $isBackend,scope: $scope,ts : ts }}(typeof exports !== "undefined" ? exports : this, typeof exports !== "undefined"));