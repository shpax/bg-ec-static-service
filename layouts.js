const Router = require('koa-router');
const _ = require('lodash');
const Prismic = require('prismic-javascript');
const PrismicDOM = require('prismic-dom');
const config = require('config');

const router = new Router();

const connect = async (ctx, next) => {
  ctx.api = await Prismic.api(config.prismic.url);
  ctx.results = async q => (await q).results;

  const layoutResponse = await ctx.api.query(Prismic.Predicates.at('document.type', 'layout'));
  const layout = _.get(layoutResponse, 'results[0].data', {});

  ctx.layout = {
    title: PrismicDOM.RichText.asText(layout.title),
    categories: layout.categories,
    about: {
      title: PrismicDOM.RichText.asText(layout.about_us_title),
      text: PrismicDOM.RichText.asText(layout.about_us),
    },
    instagramm: _.first(layout.socials, s => s.network === 'instagramm'),
  };

  return next();
};

// HOME PAGE
router.get('/', connect, async (ctx) => {
  ctx.featured = await ctx.results(ctx.api.query(
    Prismic.Predicates.at('document.tags', ['featured']),
    { fetchLinks: 'category.title' },
  ));

  return ctx.render('index', ctx);
});

// PRODUCT DETAIL PAGE
router.get('/product/:uid', connect, async (ctx) => {
  const document = await ctx.api.getByUID(
    'product',
    ctx.params.uid,
    { fetchLinks: 'category.title' },
  );

  ctx.product = {
    name: PrismicDOM.RichText.asText(document.data.name),
    description: PrismicDOM.RichText.asHtml(document.data.description),
    category: {
      uid: document.data.category.uid,
      name: PrismicDOM.RichText.asHtml(document.data.category.data.title),
    },
    images: [
      document.data.main_image.product,
      ..._.map(document.data.gallery, 'image'),
    ],
    options: document.data.options.map(({ option_name, price }) => ({
      name: PrismicDOM.RichText.asText(option_name),
      price,
    })),
  };

  ctx.layout.title = `${ctx.product.name} - BrutGroot`;

  return ctx.render('product', ctx);
});

// PRODUCT LISTING
router.get('/category/:uid?', connect, async (ctx) => {
  const [categories, products] = await Promise.all([
    ctx.results(ctx.api.query(Prismic.Predicates.at('document.type', 'category'))),
    ctx.results(ctx.api.query(Prismic.Predicates.at('document.type', 'product'))),
  ]);

  ctx.categories = categories.map(c => ({
    name: PrismicDOM.RichText.asText(c.data.title),
    uid: c.uid,
  }));
  ctx.selected = ctx.params.uid;
  ctx.products = _.filter(products, 'data.options.length').map(p => ({
    uid: p.uid,
    category: p.data.category.uid,
    name: PrismicDOM.RichText.asText(p.data.name),
    startingPrice: p.data.options.reduce((price, o) => Math.min(price, o.price), p.data.options[0].price),
    image: p.data.main_image.product,
  }));

  return ctx.render('category', ctx);
});

module.exports = router;
