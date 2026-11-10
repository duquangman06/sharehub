// All financial writes in one MongoDB transaction, including parallel-request guards.
const mongoose = require('mongoose');
mongoose.set('transactionAsyncLocalStorage', true);
module.exports = function transactionalMutations(router) {
  for (const layer of router.stack) {
    if (!layer.route || !Object.keys(layer.route.methods).some(m => ['post','put','delete','patch'].includes(m))) continue;
    const stack = layer.route.stack;
    const last = stack[stack.length - 1];
    if (['/draft'].includes(layer.route.path)) continue;
    const handler = last.handle;
    last.handle = async (req, res, next) => {
      const send = res.json.bind(res); let payload, status;
      res.json = body => { payload = body; status = res.statusCode; return res; };
      try {
        await mongoose.connection.transaction(async () => { payload = undefined; status = undefined; await handler(req, res, next); });
        if (layer.route.path === '/checkout' && status === 201) delete req.session.draft;
        res.json = send; res.status(status || 200); send(payload);
      } catch (e) { res.json = send; next(e); }
    };
  }
};
