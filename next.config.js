const fetch = require('isomorphic-unfetch');
const withMDX = require('@zeit/next-mdx')({ extension: /\.mdx?$/ });

module.exports = withMDX({
  pageExtensions: ['js', 'jsx', 'mdx', 'md'],
  exportTrailingSlash: true,

  webpack(config) {
    if (config.externals) {
      const nextExternals = config.externals[0];
      // console.log(nextExternals.toString());
      config.externals = [
        (context, request, callback) => {
          if (request.indexOf('@graffy/') === 0) return callback();
          return nextExternals(context, request, callback);
        },
      ];
    }
    return config;
  },

  async exportPathMap(pathMap) {
    /* Do nothing here. */
    return pathMap;
  },
});
