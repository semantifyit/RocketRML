let findIdinObjArr=(objArr,id)=>{
    let obj=null;
    objArr.forEach(function(o){
        if(o['@id']===id){
            obj=o;
        }
    });
    return obj;
};

module.exports.findIdinObjArr=findIdinObjArr;

