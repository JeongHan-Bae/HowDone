// @ts-check

/**
 * @typedef {Object} CucumberProfile
 * @property {string[]} requireModule
 * @property {string[]} require
 * @property {string[]} paths
 * @property {string[]} format
 */

/** @typedef {{ default: CucumberProfile }} CucumberConfiguration */
/** @type {CucumberConfiguration} */
module.exports = {
  default: {
    requireModule: ["tsx/cjs"],
    require: ["test/bdd/steps/**/*.steps.ts"],
    paths: ["test/bdd/features/**/*.feature"],
    format: ["summary"],
  },
};
