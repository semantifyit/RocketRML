const isReplaceable = (obj) => {
    const entries = Object.entries(obj);
    return (
        entries.length === 2 &&
        ((entries[0][0] === '@id' &&
        typeof entries[0][1] === 'string')||(entries[0][0] === '@type' &&
            typeof entries[0][1] === 'string'))&&
        ((entries[1][0] === '@type' &&
            typeof entries[1][1] === 'string')||(entries[1][0] === '@id' &&
            typeof entries[1][1] === 'string'))
    );
};

let todelete = [];
let o;
const replaceBlankNodes = (obj, allNodes) =>
    obj && typeof obj === 'object'
        ? isReplaceable(obj)
        ? (o = allNodes.find(e => e['@id'] === obj['@id']), p = replaceBlankNodes(o, allNodes),todelete.push(o['@id']), p)
        : Object.entries(obj).reduce(
            (acc, [k, v]) => {
                if (typeof v === 'object') {
                    acc[k] = replaceBlankNodes(v, allNodes);
                } else {
                    acc[k] = v;
                }
                return acc;
            },
            Array.isArray(obj) ? [] : {},
        )
        : obj;

const replace = (input,options) => {
    let toInsert=input[options.baseEntry];
    let allNodes=[];
    //flatten all other mapping arrays to one array;
    for (let i in input){
        if(i!==options.baseEntry){
            if(Array.isArray(input[i])){
                for(let d of input[i]){
                    allNodes.push(d);
                }
            }else{
                allNodes.push(input[i]);
            }

        }
    };
    return replaceBlankNodes(toInsert,allNodes);
};



module.exports.replace = replace;