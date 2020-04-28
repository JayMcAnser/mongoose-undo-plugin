const Mongoose = require('mongoose');
const chai = require('chai');
const assert = chai.assert;
const Address = require('./model/address');
// const JsonDiffPatch = require('jsondiffpatch');
const Session = require('./model/session');

const DiffHistory = require('mongoose-diff-history/diffHistory');

describe('undo-array', () => {
  before(async () => {
    Mongoose.connect('mongodb://localhost:27017/test', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    return Address.deleteMany({}).then(() => {
      let History = Mongoose.models.History;
      return History.deleteMany({}).then( () => {
        let session = new Session({name: 'Create'})
        let addr = Address.create(session, {guid: 'position', name: 'Doe', firstName: 'Jack'});
        addr.text.push('first');
        addr.text.push('second');
        // addr.telephoneAdd({number: '00', label: 'one'});
        return addr.save();  // v = -1
        // addr.telephoneAdd({number: '2222', label: 'two'});
        // await addr.save(); // v = 1
        // addr.telephoneAdd({number: '3333', label: 'three'});
        // addr.telephoneAdd({number: '4444', label: 'four'});
        // await addr.save(); // v = 2
      })
    })
  });

  // it('update number', async () => {
  //   let session = new Session('ses')
  //   let addr = await Address.queryOne(session, {guid: 'position'});
  //   // addr.telephone[0].number = '1111';
  //   // await addr.save();
  //   // assert.equal(addr.telephone[0].number, '1111');
  // })

  it('show what changed',async () => {
    let session = new Session('show changes')
    let addr = await Address.queryOne(session, {guid: 'position'});
    addr.name = 'Not Doe';
    await addr.save();
    // there is now a version 1
    addr.name = 'Also Doe';
    await addr.save();
    // there is now a version 2
    let hist = await addr.historySteps();
    assert.equal(hist.length, 3) // (0, 1, 2)
    let prev = await addr.historyChanges(2);
    assert.equal(prev.previousValues.name, 'Not Doe')
    prev = await addr.historyChanges(1);
    assert.equal(prev.previousValues.name, 'Doe')
  })
  it('works on text array', async() => {
    let session = new Session('array - text')
    let addr = await Address.queryOne(session, {guid: 'position'});
    addr.text.push('three');
    await addr.save();
    let prev = await addr.historyChanges(3);
    assert.equal(prev.previousValues.text.length, 2)
    assert.equal(addr.text.length, 3)
  });
  it('works on object array', async () => {
    let session = new Session('array - object')
    let addr = await Address.queryOne(session, {guid: 'position'});

    addr.telephoneAdd({number: '2222', label: 'two'});
    await addr.save(); // 4
    addr.telephoneAdd({number: '3333', label: 'three'});
    addr.telephoneAdd({number: '4444', label: 'four'});
    await addr.save(); //5
    let prev = await addr.historyChanges(4);
    assert.equal(prev.previousValues.telephone.length, 0)
    prev = await addr.historyChanges(5);
    assert.equal(prev.previousValues.telephone.length, 1)

    addr.telephone[1].number = '666';
    await addr.save(); //6
    prev = await addr.historyChanges(6);
    assert.equal(prev.previousValues.telephone.length, 3)

    addr.telephone.pop();
    await addr.save(); // 7
    prev = await addr.historyChanges(7);
    assert.equal(prev.previousValues.telephone.length, 3);

  });
  it('calc diff in object array', async() => {
    let session = new Session('array - calc difft')
    let addr = await Address.queryOne(session, {guid: 'position'});

    let prev = await addr.historyChanges(7);
    assert.equal(prev.previousValues.telephone.length, 3);

    let dif = Address.calculateDiff(prev, 'telephone');

  })
})
