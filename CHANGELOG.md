# Mongoose Undo
## revisions

## 2021-07-30 (0.3.1)
- chg: disabled the undo pluging because diffHistery.History crashes the Multi Db version.
  Should make a separate repo of this module with the proper Model handler

## 2021-07-29 (0.3.0)
- change: export Model for the Mongo definition
  DONE the dirty way, because hte diffHistorySchema is not exported.
  See: mongoose-unod

## 2021-06-04 (0.2.0)
- change: session has now an user object with a username variable

## 2020-05-06
- added Model.session
- session.setInfo(Model) to create a custom session definition

## 2020-04-27
- project setup
