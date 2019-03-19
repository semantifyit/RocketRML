const utm = require('utm');
const h2p = require('html2plaintext');

exports.predefinedFunctions = {
  'http://sti2.at#toUpperCase': function (data) {
    return data.toString().toUpperCase();
  },
  'http://sti2.at#utmToLat': function (data) {
    const x = data[0];
    const y = data[1];
    const zoneNumber = data[2];
    const zoneLetter = data[3];
    return utm.toLatLon(x, y, zoneNumber, zoneLetter, undefined, strict = false).latitude;
  },
  'http://sti2.at#utmToLon': function (data) {
    const x = data[0];
    const y = data[1];
    const zoneNumber = data[2];
    const zoneLetter = data[3];
    return utm.toLatLon(x, y, zoneNumber, zoneLetter, undefined, strict = false).longitude;
  },
  'http://sti2.at#htmlToText': function (data) {
    if (!data || !data[0]) {
      return undefined;
    }
    return h2p(data[0].toString());
  },

};
