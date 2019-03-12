const helper=require('../input-parser/helper.js');

const findIdinObjArr=(objArr,id)=>{
    let obj=null;
    objArr.forEach(function(o){
        if(o['@id']===id){
            obj=o;
        }
    });
    return obj;
};

const removeEmpty = (obj) => {
    Object.keys(obj).forEach(key => {
        if (obj[key] && typeof obj[key] === 'object') removeEmpty(obj[key]);
        else if (obj[key] == null) delete obj[key];
    });
};

const removeMeta = (obj) => {
    let result=[];
    Object.keys(obj).forEach(key => {
        let temp=helper.addArray(obj[key]);
        for (let t of temp){
            removeMetaOnObject(t);
            result.push(t);
        }
    });
    return result;
};

const removeMetaOnObject = (t) => {
    Object.keys(t).forEach(key => {
        if(key.indexOf('$') > -1){
            delete t[key];
        }
    });
};


const convertType = (obj) => {
    Object.keys(obj).forEach(key => {
        if (obj[key] && typeof obj[key] === 'object') {
            convertType(obj[key]);
        }else{
            if(key==='rdf:type'){
                let type=obj[key];
                delete obj[key];
                obj['@type']=type;
            }
        }
    });
};

module.exports.findIdinObjArr=findIdinObjArr;
module.exports.removeEmpty=removeEmpty;
module.exports.removeMeta=removeMeta;
module.exports.convertType=convertType;

