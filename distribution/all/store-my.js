const local = require('../local/local');
const util = require('../util/util');

function boilerplate(key, context, method, args, callback) {
    callback = callback || function () { };
    local.groups.get(context.gid, (e, sidsToNodes) => {
        if (e) {
            callback(new Error(`Failed to get group members for ${context.gid}`), null);
        } else {
            const nidsToNodes = {};
            const nids = Object.values(sidsToNodes).map((node) => {
                const nid = util.id.getNID(node);
                nidsToNodes[nid] = node;
                return nid;
            });
            const kid = util.id.getID(key);
            const selectedNID = context.hash(kid, nids);
            const selectedNode = nidsToNodes[selectedNID];
            if (selectedNode) {
                local.comm.send(args, {
                    service: 'store',
                    method: method,
                }, callback);
            } else {
                callback(new Error(`No node found for key ${key}`), null);
            }
        }
    })
}

const store = (config) => {
    let context = {};
    context.gid = config.gid || 'all';
    context.hash = config.hash || util.id.naiveHash;
    return {
        put: (val, key, callback) => {
            callback = callback || function () { };
            const configuration = {
                key: key,
                gid: context.gid,
            };
            boilerplate(
                key,
                context,
                'put',
                [val, configuration],
                callback
            );
        },
        get: (key, callback) => {
            callback = callback || function () { };
            const configuration = {
                key: key,
                gid: context.gid,
            };
            boilerplate(
                key,
                context,
                'get',
                [configuration],
                callback
            );
        },
        del: (key, callback) => {
            callback = callback || function () { };
            const configuration = {
                key: key,
                gid: context.gid,
            };
            boilerplate(
                key,
                context,
                'del',
                [configuration],
                callback
            );
        },

    };
}






module.exports = store;