//replace prefix (rml:test -> test) id prefix exists
function replacePrefixIfExists(input,prefixes) {
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
}
//replaces url, if last character in url is /
function replaceUrlIfExists(input) {
    let result=input;
    let splits=input.split('/');
    if(splits.length>1){
        result=splits[splits.length-1];
    }
    return result;
}

//replaces url, if last character in url is #
function replaceUrlWithHashIfExists(input) {
    let result=input;
    let splits=input.split('#');
    if(splits.length>1){
        result=splits[splits.length-1];
    }
    return result;
}

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
const checkAndRemovePrefixesFromString = (string,prefixes)=>{
    string=replaceUrlWithHashIfExists(string);
    string=replaceUrlIfExists(string);
    string=replacePrefixIfExists(string,prefixes);
    return string;
};

const replacePrefixWithURL=(string,prefixes)=>{
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

module.exports.checkAndRemovePrefixesFromObject=checkAndRemovePrefixesFromObject;
module.exports.replacePrefixIfExists=replacePrefixIfExists;
module.exports.replaceUrlWithHashIfExists=replaceUrlWithHashIfExists;
module.exports.replaceUrlIfExists=replaceUrlIfExists;
module.exports.checkAndRemovePrefixesFromString=checkAndRemovePrefixesFromString;
module.exports.replacePrefixWithURL=replacePrefixWithURL;