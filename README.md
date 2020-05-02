# Mongoose Undo

An easy plug for undo and version compare with Mongoose records

## Requeriments
The MongoDB database version must be 4.x+ in order for this package to work correctly.

## Documentation

```javascript
   npm install mognoose-undo
```

### creating a model with undo capability
```javascript
const Mongoose  = require('mongoose');
const UndoHelper = require('mongoose-undo');

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
```

The plugin creates a number of new function:
```javascript
  create(session, data);                        
  queryOne(session, where, fields, options);
  queryById(session, id, fields, options);
  query(session, where, fields, options);

  // version management
  getVersion(session, index, options);
  history(options); 
  historySteps(options);
  historyFields(options);
  historyUndoVersion(session, version, options);
  historyChanges(version, options);
  calculateDiff(diff, fieldName);
```

## Example
```javascript
  const Mongoose = require('mongoose');
  const Address = require('./model/address');
  // example of a session object is stored in test/model
  const Session = require('./model/session');
  Mongoose.connect('mongodb://localhost:27017/test', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  
  let addr = Address.create(session,{guid: '123211', name: 'Doe', firstName: 'John'})
  // this will do anything with the session  
  await addr.save();
  addr.firstName = 'Jane';
  await addr.save();
  
  let hist = await addr.history();
  for (let l = 0; l < hist.length; l++) {
    console.log(`user: ${hist[l].changedBy}, on: ${hist[l].createdAt}, reason: ${hist[l].reason}`);
  }
 
}




   

```



[Revisions](CHANGELOG.md)

Have a nice day

&copy; 2020 MIT - Jay McAnser 
