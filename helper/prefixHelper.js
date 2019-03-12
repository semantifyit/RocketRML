const helper=require('../input-parser/helper.js');

//replace prefix (rml:test -> test) id prefix exists
const replacePrefixIfExists=(input,prefixes)=> {
    if(input.indexOf(':')!==-1){
        let p=input.split(':');
        if(p.length!==2){
            //too many : in string (only one allowed)
            throw('replacePrefixIfExists(): Error during processing string: too many ":" in '+input+ ' ! only one allowed.');
        }
        let prefix=p[0];
        let value=p[1];
        if (!prefixes[prefix]){
            //prefix not declared
            throw('replacePrefixIfExists(): Error during processing string: Prefix '+prefix+' is not defined');
        }
        return value;
    }else{
        return input;
    }
};

//replaces url, if last character in url is /
const replaceUrlIfExists=(input)=> {
    let result=input;
    let splits=input.split('/');
    if(splits.length>1){
        result=splits[splits.length-1];
    }
    return result;
};

//replaces url, if last character in url is #
const replaceUrlWithHashIfExists=(input)=> {
    let result=input;
    let splits=input.split('#');
    if(splits.length>1){
        result=splits[splits.length-1];
    }
    return result;
};

//remove all prefixes (url and all others)
const checkAndRemovePrefixesFromObject = (object,prefixes)=>{
    let result={};
    Object.keys(object).forEach(function(key) {
        let val = object[key];
        key=replaceUrlWithHashIfExists(key);
        key=replaceUrlIfExists(key);
        key=replacePrefixIfExists(key,prefixes);
        result[key]=val;
    });
    return result;
};

//remove all prefixes (url and all others)
const checkAndRemovePrefixesFromStringWithBr = (string,prefixes)=> {
    let arr=string.split('{');
    if (arr.length>1){
        let pre=arr[0];
        let post='{'+arr[1];
        pre = replaceUrlWithHashIfExists(pre);
        pre = replaceUrlIfExists(pre);
        pre = replacePrefixIfExists(pre, prefixes);
        return pre+post;
    }else{
        return string;
    }
};

//remove all prefixes (url and all others)
const checkAndRemovePrefixesFromString = (string,prefixes)=>{
    string=replaceUrlWithHashIfExists(string);
    string=replaceUrlIfExists(string);
    string=replacePrefixIfExists(string,prefixes);
    return string;
};

//removes all prefixes (urls and shortcuts) from object and returns it
const deleteAllPrefixesFromObject = (obj,prefixes)=>{
    let result=JSON.stringify(obj,null,2);
    for (let key in prefixes) {
        if (prefixes.hasOwnProperty(key)) {
            result=result.replace(new RegExp(prefixes[key], 'g'), '');
            result=result.replace(new RegExp(key+':', 'g'), '');
        }
    }
    return JSON.parse(result);
};

const replacePrefixWithURL=(string,prefixes)=>{
  if(helper.isURL(string)){
    return string;
  }
  let stringarr=string.split(':');
  if(stringarr.length >1){
      if(prefixes[stringarr[0]]){
          return string.replace(stringarr[0]+':',prefixes[stringarr[0]]);
      }else{
          //prefix not in prefixes
          return string;
      }
  }else{
      //no prefix found
      return string;
  }
};

module.exports={
    checkAndRemovePrefixesFromObject:checkAndRemovePrefixesFromObject,
    replacePrefixIfExists:replacePrefixIfExists,
    replaceUrlWithHashIfExists:replaceUrlWithHashIfExists,
    replaceUrlIfExists:replaceUrlIfExists,
    checkAndRemovePrefixesFromString:checkAndRemovePrefixesFromString,
    checkAndRemovePrefixesFromStringWithBr:checkAndRemovePrefixesFromStringWithBr,
    replacePrefixWithURL:replacePrefixWithURL,
    deleteAllPrefixesFromObject:deleteAllPrefixesFromObject
};

