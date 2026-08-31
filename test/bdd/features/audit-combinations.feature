Feature: Data-driven documented CLI combinations
  The real CLI maps each case to a fixture-owned source, argv, diagnostics, and output oracle.

  Scenario Outline: A documented CLI combination matches its fixture
    Given the CLI audit fixture "<case>"
    When I run the CLI audit fixture
    Then the CLI audit result matches its fixture

    Examples:
      | case                              |
      | standalone-help-with-path         |
      | standalone-version-with-path      |
      | standalone-dependencies-with-path |
      | percentage-equal-with-display-options |
      | mixed-default-no-color            |
      | mixed-default-no-pager            |
      | mixed-default-no-color-no-pager   |
      | mixed-details-no-color-no-pager   |
      | merged-tree-with-display-options  |
      | merged-json-exact                 |
      | multiple-warnings-visible         |
      | multiple-warnings-silent          |
      | multiple-warnings-strict          |
      | multiple-warnings-strict-silent   |
      | single-frontmatter-weight-silent  |
      | direct-yaml-root-record           |
      | direct-toml-root-record           |
      | toml-bare-root-array              |
      | yaml-invalid-named-record-sequence |
      | yaml-mixed-named-and-unnamed-sequence |
      | toml-mixed-boolean-and-array      |
      | separate-tree-layout-exact        |
      | separate-details-layout-exact     |
