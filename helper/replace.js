let {JSONPath} = require("jsonpath-plus");

const findObjEntry = (id, data) => {
    let jsonpath = "$..[?(@['@id']=='" + id + "')]";

    let result = JSONPath({path: jsonpath, json: data});
    if (Array.isArray(result)) {
        if (result.length === 0) {
            result = undefined;
        }
        if (result.length === 1) {
            result = result[0];
        }
        if (result.length > 1) {
            console.log("Found many ids for: " + id + ". Choosing first one");
            result = result[0];
        }
    }
    return result;
};

const recursivelyIterateObject = (mainObject, searchData) => {
    if (mainObject && typeof mainObject === 'object') {
        if (Array.isArray(mainObject)) {
            mainObject.forEach(function (arr_o) {
                recursivelyIterateObject(arr_o, searchData)
            });
        } else {
            for (let key in mainObject) {
                let other = false;
                let id = undefined;
                let value = mainObject[key];
                if (value && typeof value === 'object') {
                    if (Array.isArray(value)) {
                        value.forEach(function (child_a) {
                            recursivelyIterateObject(child_a, searchData)
                        });
                    } else {
                        if (value && value['@id']) {
                            id = value['@id'];
                        } else {
                            if (value && Object.keys(value).length > 2) {
                                other = true;
                            }

                        }
                    }
                    if (!other && id) {
                        mainObject[key] = findObjEntry(id, searchData);
                    } else {
                        recursivelyIterateObject(value, searchData);
                    }
                }
            }
        }
    }
};

const replace = (data, options) => {
    let result = undefined;
    if (!Array.isArray(data) || data.length < 2) {
        console.log("Cannot replace data!");
        return data;
    } else {
        console.log("Replacing data..");
        result = JSON.parse(JSON.stringify(data[options.baseEntry]));
        let searchFor = [];
        for(let i=0;i<data.length;i++){
            if(i!==options.baseEntry){
                searchFor.push(data[i]);
            }
        }
        recursivelyIterateObject(result, searchFor);
    }
    return result;
};

module.exports.replace = replace;