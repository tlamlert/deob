const id = require('../util/id');
const serialization = require('../util/serialization');
const fs = require('fs');
const path = require('path');

const storeDir = path.join(__dirname, '../../store');

// create node store directory if it does not exist
if (!fs.existsSync(storeDir)) fs.mkdirSync(storeDir);
// create node store directory if it does not exist
if (!fs.existsSync(`${storeDir}/s-${global.moreStatus.sid}`)) fs.mkdirSync(`${storeDir}/s-${global.moreStatus.sid}`);


const store = {};


function normalize(configuration) {
    if (!configuration) {
        configuration = { key: null };
    } else if (typeof configuration === 'string') {
        configuration = { key: configuration };
    } else if (typeof configuration === 'object') {
        configuration = configuration;
    }
    return configuration;
}

store.put = function (val, configuration, callback) {
    callback = callback || function () { };
    configuration = normalize(configuration);
    configuration.key = configuration.key || id.getID(val);
    configuration.gid = configuration.gid || 'local'
    let serialized = serialization.serialize(val);
    let filename = Buffer.from(configuration.key).toString('base64');
    filename = `${storeDir}/s-${global.moreStatus.sid}/${configuration.gid}-${filename}`;
    fs.writeFile(filename, serialized, (e) => {
        if (e) {
            callback(new Error(`[${global.moreStatus.sid}]: Error saving ${configuration.key} in ${configuration.gid} in file ${filename}`), null);
        } else {
            // console.log(`[${global.moreStatus.sid}]: put ${configuration.key} in ${configuration.gid} -> ${val}`);
            callback(null, val);
        }
    })
}

store.get = function (configuration, callback) {
    callback = callback || function () { };
    configuration = normalize(configuration);
    configuration.gid = configuration.gid || 'local';
    if (!configuration.key) {
        // get all keys that starts with gid
        fs.readdir(`${storeDir}/s-${global.moreStatus.sid}`, (e, files) => {
            if (e) {
                callback(e, null);
            } else {
                // let keys = files.map((file) => {
                //     if (file.split('-')[0] === configuration.gid) {
                //         return file.split('-')[1];
                //     }
                // });
                let keys = [];
                for (let i = 0; i < files.length; i++) {
                    if (files[i].split('-')[0] === configuration.gid) {
                        const filename = files[i].split('-')[1]
                        // decode base64
                        const key = Buffer.from(filename, 'base64').toString('ascii');
                        keys.push(key);
                    }
                }

                // console.log(`[${global.moreStatus.sid}]: get ${keys.length} keys in ${configuration.gid}`);
                callback(null, keys);
            }
        });

        return;
    } else {
        let filename = Buffer.from(configuration.key).toString('base64');
        filename = `${storeDir}/s-${global.moreStatus.sid}/${configuration.gid}-${filename}`;

        fs.readFile(filename, (e, bytes) => {
            if (e) {
                callback(new Error(`[${global.moreStatus.sid}]: Key ${configuration.gid}/${configuration.key} not found`), null);
            } else {
                let serialized = bytes.toString();
                try {
                    let state = serialization.deserialize(serialized);
                    // console.log(`[${global.moreStatus.sid}]: get ${configuration.key} in ${configuration.gid} in file ${filename}`);
                    callback(null, state);
                } catch (e) {
                    console.error(`[${global.moreStatus.sid}]: Error deserializing ${configuration.key} in ${configuration.gid}`);
                    throw e;
                }

            }
        });
    }

}

store.del = function (configuration, callback) {
    callback = callback || function () { };
    configuration = normalize(configuration);
    configuration.gid = configuration.gid || 'local';
    // try to get the key first
    store.get(configuration, (e, state) => {
        if (e) {
            callback(e);
        } else {
            let filename = Buffer.from(configuration.key).toString('base64');
            filename = `${storeDir}/s-${global.moreStatus.sid}/${configuration.gid}-${filename}`;
            fs.unlink(filename, (e) => {
                if (e) {
                    callback(e, null);
                } else {
                    callback(null, state);
                }
            });
        }
    });

}

module.exports = store;