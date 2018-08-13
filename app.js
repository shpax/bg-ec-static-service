/* eslint-disable no-console */

const Koa = require('koa');
const serve = require('koa-static');
const config = require('config');
const views = require('koa-views');

const layouts = require('./layouts');

const app = new Koa();

app.use(views(`${__dirname}/views`, {
  extension: 'pug',
}));

app.use(serve(`${__dirname}/public`));

app
  .use(layouts.routes())
  .use(layouts.allowedMethods());

app.listen(config.port);

console.log(`listening on port ${config.port}`);
