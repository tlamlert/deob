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
                    node: selectedNode,
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
            if (!key) {
                key = util.id.getID(val);
            }
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
            if (!key) {
                // get all (so have to comm to all nodes)
                global.distribution[context.gid].comm.send(
                    [configuration],
                    {
                        service: 'store',
                        method: 'get',
                    }, (e, v) => {
                        if (v) {
                            v = Object.values(v).flat(Infinity);
                        }
                        callback(e, v);

                    }
                )
            } else {
                boilerplate(
                    key,
                    context,
                    'get',
                    [configuration],
                    callback
                );
            }
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