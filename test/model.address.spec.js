/**
 * test routine for an address
 */

const Mongoose = require('mongoose');
const chai = require('chai');
const assert = chai.assert;
const Address = require('./model/address');
// const JsonDiffPatch = require('jsondiffpatch');
const Session = require('./model/session');
// const DiffHistory = require('mongoose-diff-history/diffHistory');


describe('model.address', () => {

  let address, addrUpdate;
  let session = new Session({name: 'one', id: '1'})

  before(() => {
    Mongoose.connect('mongodb://localhost:27017/test', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    return Address.deleteMany({}).then(() => {
      // let History = Db.Mongoose.Histories;
      // return History.deleteMany({})
     })
  })

  describe('basic', () => {
    it('create normal', async () => {
      address = Address.create(session, {guid: '1', name: 'test 1'});
      await address.save();
      address = await Address.queryOne(session, {guid: '1'});
      assert.equal(address.name, 'test 1')
    });

    it('update', async() => {
      address = await Address.queryOne(session, {guid: '1'});
      address.name = 'test 2';
      addrUpdate = await address.save()
      address.name = 'test 3';
      addrUpdate = await address.save()

    });

    it('has history', async () => {
      let hist = await address.history()
      assert.equal(hist.length, 3);
      assert.equal(hist[0].changedBy, session.name)
    });

    it('not found queryOne', async() => {
      let addr = await Address.queryOne(session,{guid: 'XXXXXXX'});
      assert.equal(addr, false)
    });
    it('not found queryById', async() => {
      let addr = await Address.queryById(session, '123123123123');
      assert.equal(addr, false)
    })
    it('not found query', async() => {
      let addr = await Address.query(session,{guid: 'XXXXXXX'});
      assert.equal(addr.length, 0)
    })

  })


  /**
   * what do we want to see in the history
   * When I change something I want to be able to see the previous version of the data. So I want to so what I have
   * overwritten by my changes so:
   *    John: create record with name: 'one'
   *    Jane: update name: 'two'
   *    Piere: update name: 'three'
   *
   * what we display is tree steps
   *    Piere: current state: name: 'Piere - tree'
   *    Jane: step -1: name: 'Jane - two'
   *    John: step -2: name: 'John - one'
   */

  describe('version view', () => {

    let addr;
    let longText = '';

    before( async () => {
      for (let l = 0; l < 1000; l++) {
        longText += String.fromCharCode([Math.floor(Math.random() * 26) + 'a'.charCodeAt(0), 32][(Math.floor(Math.random() * 10) % 10)  === 0 ? 1 : 0])
      }
      //console.log(longText)
      let ses1 = new Session({name: 'John', reason: 'multi undo'});
      addr = Address.create(ses1, { guid: '6', name: 'one - John', firstName: 'John', longText: 'John - ' + longText})
      await addr.save();

      ses1 = new Session({name: 'Jane'});
      addr = await Address.queryOne(ses1, {guid: '6'})
      addr.name = 'two - Jane';
      addr.longText = 'TwoJane' + longText
      await addr.save();

      ses1 = new Session({name: 'Piere'});
      addr = await Address.queryOne(ses1, {guid: '6'});
      addr.firstName = 'Piere';
      addr.name = 'three - Piere';
      addr.longText = 'Piere - ' + longText
      await addr.save();
    })

    it('history', async () => {
      let hist = await addr.history()
      assert.equal(hist.length, 3);
      assert.equal(hist[0].changedBy, 'John');
      assert.equal(hist[1].changedBy, 'Jane');
      assert.equal(hist[2].changedBy, 'Piere');
    })

    it('history steps', async () => {
      let hist = await addr.historySteps()
      assert.equal(hist.length, 3);
      assert.equal(hist[0].user, 'John');
      assert.equal(hist[1].user, 'Jane');
      assert.equal(hist[2].user, 'Piere');
    });
    it('full versions steps restore', async () => {
      let ses2 = new Session({name: 'Klaas'})
      let v = await addr.getVersion(ses2, 1);
      assert.equal(v.name, 'two - Jane');
      assert.equal(v.firstName, 'John');
      assert.equal(v.longText.substr(0, 7), 'TwoJane')
      v = await addr.getVersion(ses2, 0);
      assert.equal(v.name, 'one - John');
      // await v.save();
      // let hist = await addr.historySteps()
      // assert.equal(hist.length, 3);
      // assert.equal(hist[2].user, 'Klaas');
    });

    it('fields', async () => {
      let diff = await addr.historyFields();
      assert.equal(diff.length, 3);
      assert.equal(diff[0].user, 'John');
      assert.equal(diff[1].fields.length, 2);
      assert.equal(diff[1].fields[0], 'name')
      assert.equal(diff[1].fields[1], 'longText')
    });

    it('undo one', async () => {
      addr = await Address.findOne({guid: 6});
      assert.equal(addr.firstName, 'Piere', 'check reloaded version did not change');
      let rec = await addr.historyUndoVersion(session, 0);
      assert.equal(rec.name,'one - John');
      assert.equal(rec.firstName, 'Piere', 'did not remove later changes, just the changes done by version 0');
      assert.equal(rec.longText, 'John - ' + longText, 'must find the previous ones to find the value');
    })
  })


  describe('complex records', () => {
    before(async () => {
      let session = new Session({name: 'Create'})
      let addr = Address.create(session, {guid: 'complex', name: 'Johnson', firstName: 'Jack'});
      addr.telephone.push({number: '06123456789', label: 'private'});
      await addr.save();
    });

    it('change array element', async() => {
      let session = new Session('first')
      let addr = await Address.queryOne(session, {guid: 'complex'});
      assert.isTrue(addr !== false);
      addr.telephone[0].number = '09876543210';
      await addr.save();

      let ses2 = new Session('two');
      addr = await Address.queryOne(ses2, {guid: 'complex'});
      let hist = await addr.historyFields()
      assert.equal(hist.length, 2);
      assert.equal(addr.telephone[0].number, '09876543210');
      // restore the previous version
      let prevAddr = await addr.historyUndoVersion(ses2, 0);
      await prevAddr.save();

      addr = await Address.queryOne(ses2, {guid: 'complex'});
      assert.equal(addr.telephone[0].number, '06123456789', 'previous version is back');
    });

    it('add element', async() => {
      let session = new Session('three')
      let addr = await Address.queryOne(session, {guid: 'complex'});
      assert.isTrue(addr !== false);
      assert.equal(addr.telephone.length, 1);
      addr.telephone.push({number: '123456', label: 'next'});
      await addr.save();

      // remove an element
      addr = await Address.queryOne(session, {guid: 'complex'});
      assert.equal(addr.telephone.length, 2);
      addr.telephone.pull({_id: addr.telephone[0]._id});
      assert.equal(addr.telephone.length, 1);
      await addr.save();

      // restore the last revision
      addr = await Address.queryOne(session, {guid: 'complex'});
      assert.equal(addr.telephone.length, 1);
      let hist = await addr.historyFields()
      let prevAddr = await addr.historyUndoVersion(session, hist[hist.length - 1].version); // latest version
      await prevAddr.save();
      addr = await Address.queryOne(session, {guid: 'complex'});
      assert.equal(addr.telephone.length, 2);
      assert.equal(addr.telephone[1].number, '123456')
    });
  });

});
