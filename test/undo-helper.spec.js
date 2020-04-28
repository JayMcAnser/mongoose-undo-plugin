const chai = require('chai');
const assert = chai.assert;
const UndoHelper = require('../src/mongoose-undo');

describe('undo-helper', () => {

  describe('calculateDiff', () => {
    it('create new', () => {
      let diff = {
        "current": {
          "telephone": [
            {
              "_id": "5ea5b243d2d2a2f28c1f9367",
              "number": "2222",
              "label": "two"
            },
            {
              "_id": "5ea5b243d2d2a2f28c1f936a",
              "number": "666",
              "label": "three"
            }
          ]
        },
        "previousValues": {
        }
      }
      let chg = UndoHelper.calculateDiff(diff, 'telephone')
      assert.equal(chg.length, 2)
      assert.equal(chg[0].action, 'add');
      assert.equal(chg[0].element.number, '2222')
    });
    it('add one new', () => {
      let diff = {
        "current": {
          "telephone": [
            {
              "_id": "5ea5b243d2d2a2f28c1f9367",
              "number": "2222",
              "label": "two"
            },
            {
              "_id": "5ea5b243d2d2a2f28c1f936a",
              "number": "666",
              "label": "three"
            }
          ]
        },
        "previousValues": {
          "telephone": [
            {
              "_id": "5ea5b243d2d2a2f28c1f9367",
              "number": "2222",
              "label": "two"
            }
          ]
        }
      }
      let chg = UndoHelper.calculateDiff(diff, 'telephone')
      assert.equal(chg.length, 2)
      assert.equal(chg[0].action, 'none')
      assert.equal(chg[1].action, 'add');
    });
    it('update one new', () => {
      let diff = {
        "current": {
          "telephone": [
            {
              "_id": "5ea5b243d2d2a2f28c1f9367",
              "number": "2222",
              "label": "two"
            },
            {
              "_id": "5ea5b243d2d2a2f28c1f936a",
              "number": "666",
              "label": "three"
            }
          ]
        },
        "previousValues": {
          "telephone": [
            {
              "_id": "5ea5b243d2d2a2f28c1f9367",
              "number": "2222",
              "label": "two"
            },
            {
              "_id": "5ea5b243d2d2a2f28c1f936a",
              "number": "777",
              "label": "three"
            }
          ]
        }
      }
      let chg = UndoHelper.calculateDiff(diff, 'telephone')
      assert.equal(chg.length, 2)
      assert.equal(chg[1].action, 'update');
    });
    it('remove one new', () => {
      let diff = {
        "current": {
          "telephone": [
            {
              "_id": "5ea5b243d2d2a2f28c1f936a",
              "number": "666",
              "label": "three"
            }
          ]
        },
        "previousValues": {
          "telephone": [
            {
              "_id": "5ea5b243d2d2a2f28c1f9367",
              "number": "2222",
              "label": "two"
            },
            {
              "_id": "5ea5b243d2d2a2f28c1f936a",
              "number": "777",
              "label": "three"
            }
          ]
        }
      }
      let chg = UndoHelper.calculateDiff(diff, 'telephone')
      assert.equal(chg.length, 2)
      assert.equal(chg[0].action, 'remove');
    });

  })
})
