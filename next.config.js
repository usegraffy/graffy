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
  webpack(config, { isServer }) {
    if (config.externals) {
      const nextExternals = config.externals[0];
      config.externals = [
        (context, request, callback) => {
          if (request.indexOf('@graffy/') === 0) return callback();
          return nextExternals(context, request, callback);
        },
      ];
    }

    config.resolve.extensions = config.resolve.extensions
      .map(ext => `.${isServer ? 'server' : 'client'}${ext}`)
      .concat(config.resolve.extensions);

    if (isServer) {
      if (!config.plugins[1].definitions)
        throw Error('Define plugin not found');
      config.plugins[1].definitions['__dirroot'] = `'${__dirname}'`;
    }

    return config;
  },

  async exportPathMap(pathMap) {
    /* Do nothing here. */
    return pathMap;
  },
});
