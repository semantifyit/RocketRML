const utm = require('utm');
const h2p = require('html2plaintext');

exports.predefinedFunctions = {
    'toUpperCase':function(data) {
        return data.toString().toUpperCase();
    },
    'utmToLat':function(data) {
        let x=data[0];
        let y=data[1];
        let zoneNumber=data[2];
        let zoneLetter=data[3];
        return utm.toLatLon(x, y, zoneNumber, zoneLetter,undefined, strict=false).latitude;
    },
    'utmToLon':function(data) {
        let x=data[0];
        let y=data[1];
        let zoneNumber=data[2];
        let zoneLetter=data[3];
        return utm.toLatLon(x, y, zoneNumber, zoneLetter,undefined, strict=false).longitude;
    },
    'htmlToText':function(data) {
        if(!data || !data[0]){
            return undefined;
        }
        return h2p(data[0].toString());
    },

};