const fs = require('fs');
const path = require('path');

function getContent(name) {
  return JSON.stringify(
    fs.readdirSync(path.join(__dirname, 'pages', name)).map(filename => {
      const url = filename.substr(0, filename.length - 3);
      const title = url[3].toUpperCase() + url.substr(4);
      return { title, url: `/${name}/${url}` };
    }),
  );
}

const withMDX = require('@zeit/next-mdx')({
  extension: /\.mdx?$/,
  options: {
    hastPlugins: [require('@mapbox/rehype-prism')],
  },
});

module.exports = withMDX({
  pageExtensions: ['js', 'jsx', 'mdx', 'md'],
  exportTrailingSlash: true,

  // Build @graffy libs with Webpack even for server-side builds.
  // This is because externals are loaded with require(), and Next.js
  // uses the esm polyfill to support ES modules under Node which
  // refuses to import ES modules with require().

  // So for now, even though it's slower, we bundle up the @graffy
  // dependencies on Node to render static pages.
  webpack(config) {
    if (config.externals) {
      const nextExternals = config.externals[0];
      config.externals = [
        (context, request, callback) => {
          if (request.indexOf('@graffy/') === 0) return callback();
          return nextExternals(context, request, callback);
        },
      ];
    }

    if (!config.plugins[1].definitions) throw Error('Define plugin not found');
    config.plugins[1].definitions['__navMenu'] = `[
        { title: 'Home', url: '/' },
        { title: 'Learn', url: '#l', children: ${getContent('learn')} },
        { title: 'Recipes', url: '#p', children: ${getContent('recipes')} },
        { title: 'Theory', url: '#t', children: ${getContent('theory')} },
        { title: 'Reference', url: '#r', children: ${getContent('reference')} },
      ]`;

    return config;
  },

  async exportPathMap(pathMap) {
    /* Do nothing here. */
    return pathMap;
  },
});
