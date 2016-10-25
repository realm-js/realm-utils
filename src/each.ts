import { Utils as utils } from './utils';


/**
 * Each function
 * Iterates any objects including Promises
 */
export var Each = (argv: any, cb: { (...args): any }) => {
    return new Promise((resolve, reject) => {
        const results = [];
        const isObject = utils.isPlainObject(argv);
        const isMap = utils.isMap(argv);

        if (!argv) {
            return resolve(results)
        }
        // Handle map differently
        if (isMap) {
            let map: Map<any, any> = argv;
            let iterator = map.entries();
            let iterateMap = (data: any) => {
                if (data.value) {
                    let [k, v] = data.value;
                    let res = cb(...[v, k]);
                    if (utils.isPromise(res)) {
                        res.then(a => {
                            results.push(a);
                            iterateMap(iterator.next());
                        }).catch(reject);
                    } else {
                        results.push(res);
                        iterateMap(iterator.next());
                    }
                } else {
                    return resolve(results);
                }
            }
            iterateMap(iterator.next());
            return;
        }
        const dataLength = isObject ? Object.keys(argv).length : argv.length

        let index: number = -1;
        let iterate = () => {
            index++;
            if (index < dataLength) {
                let key = isObject ? Object.keys(argv)[index] : index;
                let value = isObject ? argv[key] : argv[index];
                // Promises need to be resolved
                if (utils.isPromise(value)) {
                    value.then(data => { results.push(data); iterate(); }).catch(reject);
                } else {
                    let res = cb(...[value, key]);
                    if (utils.isPromise(res)) {
                        res.then((a) => {
                            results.push(a);
                            iterate();
                        }).catch(reject);
                    } else {
                        results.push(res);
                        iterate();
                    }
                }
            } else return resolve(results);
        };
        return iterate();
    });
}
