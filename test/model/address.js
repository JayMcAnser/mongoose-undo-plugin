/**
 * basic address with a history store
 */


const Mongoose  = require('mongoose');
const UndoHelper = require('../../src/mongoose-undo');

let FieldLayout = {
  number: {type: String},
  label: {type: String}
}

let AddressLayout = {
  // this part if only filled during creation
  created: UndoHelper.createSchema,

  guid: {
    type: 'string'
  },
  name: {
    type: 'string'
  },
  firstName : {
    type: 'string'
  },
  longText: {
    type: 'string'
  },
  text: [{type: String}],
  telephone: [FieldLayout]
};

let AddressSchema = new Mongoose.Schema(AddressLayout);

AddressSchema.methods.telephoneAdd = function(data) {
  data._id = new Mongoose.Types.ObjectId()
  this.telephone.push(data);
}

AddressSchema.plugin(UndoHelper.plugin);
module.exports = Mongoose.model('Address', AddressSchema);
