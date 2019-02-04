const isReplaceable = (obj) => {
    const entries = Object.entries(obj);
    return (
        entries.length === 2 &&
        entries[0][0] === '@id' &&
        typeof entries[0][1] === 'string'&&
        entries[1][0] === '@type' &&
        typeof entries[1][1] === 'string'
    );
};

let todelete = [];
let o;
const replaceBlankNodes = (obj, allNodes) =>
    typeof obj === 'object'
        ? isReplaceable(obj)
        ? (o = allNodes.find(e => e['@id'] === obj['@id']), p = replaceBlankNodes(o, allNodes), todelete.push(o['@id']), p)
        : Object.entries(obj).reduce(
            (acc, [k, v]) => {
                if (typeof v === 'object') {
                    if (Array.isArray(v)) {
                        acc[k] = v.map((vi) => replaceBlankNodes(vi, allNodes));
                    } else {
                        acc[k] = replaceBlankNodes(v, allNodes);
                    }
                } else {
                    acc[k] = v;
                }
                return acc;
            },
            Array.isArray(obj) ? [] : {},
        )
        : obj;


const replace = async(input,options) => {
    const replaced = replaceBlankNodes(input, input);
    return replaced[options.baseEntry];
};



module.exports.replace = replace;