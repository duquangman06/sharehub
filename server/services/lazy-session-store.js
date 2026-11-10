const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
// Delay client acquisition until the shared database connection is ready.
module.exports = class LazySessionStore extends session.Store {
  constructor(initialize) { super(); this.initialize = initialize; }
  async connected() {
    await this.initialize();
    if (!this.inner) this.inner = MongoStore.create({client:mongoose.connection.getClient(),ttl:14*24*3600});
    return this.inner;
  }
  get(sid, callback) { this.connected().then(store=>store.get(sid,callback),callback); }
  set(sid, value, callback=()=>{}) { this.connected().then(store=>store.set(sid,value,callback),callback); }
  destroy(sid, callback=()=>{}) { this.connected().then(store=>store.destroy(sid,callback),callback); }
  touch(sid, value, callback=()=>{}) { this.connected().then(store=>store.touch(sid,value,callback),callback); }
};
