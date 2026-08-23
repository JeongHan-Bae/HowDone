module.exports = {
  default: {
    requireModule: ["tsx/cjs"],
    require: ["test/bdd/steps/**/*.ts"],
    paths: ["test/bdd/features/**/*.feature"],
    format: ["progress"],
  },
};
