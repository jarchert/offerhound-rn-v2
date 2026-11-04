// The staging app installs alongside production and never claims its links.
module.exports = ({ config }) => {
  if (process.env.APP_ENV !== 'staging') return config;
  return {
    ...config,
    name: 'OfferHound QA',
    scheme: 'offerhound-staging',
    ios: {
      ...config.ios,
      bundleIdentifier: 'com.emergentmindlab.offerhoundv2.staging',
      associatedDomains: [],
    },
    android: {
      ...config.android,
      package: 'com.emergentmindlab.offerhoundv2.staging',
      intentFilters: [],
    },
  };
};
