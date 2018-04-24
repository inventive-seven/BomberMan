function eliminateDuplicates(arr) {
    var i, len = arr.length,
        out = [],
        obj = {};

    for (i = 0; i < len; i++) {
        obj[arr[i]] = 0;
    }
    for (i in obj) {
        out.push(i);
    }
    return out;
}

module.exports.genId = function(str) {
    var len = str.length;
    var chars = [];
    for (var i = 0; i < len; i++) {

        chars[i] = str[Math.floor((Math.random() * len))];

    }

    var filtered = eliminateDuplicates(chars);

    return filtered.join('');


}

module.exports.isValidCredentials = function(id, nickname) {
    if (!!id && !!nickname)
        return (nickname.length < 100 && id === eliminateDuplicates(id.split('')).join(''))
    else
        return id.length < 100
}
module.exports.getRandomInt = function(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}
Array.prototype.inArray = function(comparer) {
    for (var i = 0; i < this.length; i++) {
        if (comparer(this[i])) return true;
    }
    return false;
};

// adds an element to the array if it does not already exist using a comparer 
// function
Array.prototype.pushIfNotExist = function(element, comparer) {
    if (!this.inArray(comparer)) {
        this.push(element);
    }
};