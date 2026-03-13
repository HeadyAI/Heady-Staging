// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  HeadyMCP.com — Site-specific Eleventy configuration             ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

module.exports = function(eleventyConfig) {
  // HeadyMCP-specific overrides
  eleventyConfig.addPassthroughCopy('assets');

  return {
    dir: {
      input: '.',
      output: '../../_dist/headymcp.com',
    },
  };
};
