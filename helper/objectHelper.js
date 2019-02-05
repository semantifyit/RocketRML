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

module.exports.findIdinObjArr=findIdinObjArr;
module.exports.removeEmpty=removeEmpty;

