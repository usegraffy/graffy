const fs = require('fs');
const path = require('path');

function getContent(name) {
  return JSON.stringify(
    fs.readdirSync(path.join(__dirname, 'pages', name)).map((filename) => {
      const url = filename.substr(0, filename.length - 3); // Remove .md
      const title = url.substr(3).replace(/-+/g, ' ');
      return { title, url: `/${name}/${url}` };
    }),
  );
}

const withMDX = require('@next/mdx')({
  extension: /\.mdx?$/,
  options: {
    rehypePlugins: [require('@mapbox/rehype-prism')],
  },
});

module.exports = withMDX({
  pageExtensions: ['js', 'jsx', 'mdx', 'md'],
  // exportTrailingSlash: true,

  // Build @graffy libs with Webpack even for server-side builds.
  // This is because externals are loaded with require(), and Next.js
  // uses the esm polyfill to support ES modules under Node, which
  // refuses to import ES modules with require().

  // So for now, even though it's slower, we bundle up the @graffy
  // dependencies on Node to render static pages.
  webpack(config, { isServer }) {
    if (isServer && config.externals) {
      const nextExternals = config.externals[0];
      config.externals = [
        (context, request, callback) => {
          if (request.indexOf('@graffy/') === 0) return callback();
          return nextExternals(context, request, callback);
        },
      ];
    }

    const definePlugin = config.plugins.find(
      (plugin) => plugin.constructor.name === 'DefinePlugin',
    );
    definePlugin.definitions['__navMenu'] = `[
        { title: 'Home', external: false, url: '/' },
        { title: 'Learn', external: false, url: '#l', children: ${getContent(
          'learn',
        )} },
        { title: 'Why', external: false, url: '#w', children: ${getContent(
          'why',
        )} },
        { title: 'Theory', external: false, url: '/advanced/01-Theory' },
        { title: 'Reference', external: false, url: '#r', children: ${getContent(
          'reference',
        )} },
        { title: 'Github', external: true, url: 'https://github.com/usegraffy/graffy' }
      ]`;

    return config;
  },

  async exportPathMap(pathMap) {
    /* Do nothing here. */
    return pathMap;
  },
});
