var Transform = require('stream').Transform;

function DelayStream () {
    Transform.apply(this, arguments);
}

DelayStream.prototype = Object.create(Transform.prototype);
DelayStream.prototype._transform = Transform.prototype.push;

module.exports = DelayStream;
