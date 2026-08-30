Feature: Frontmatter checklist semantics
  These scenarios prove YAML and TOML checklist recognition and rejection boundaries.

  Scenario: YAML booleans form a single-source semantic checklist in JSON
    Given the frontmatter fixture "yaml-checklist-only"
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stdout is valid JSON

  Scenario: TOML booleans form a separate semantic checklist in tree output
    Given the frontmatter fixture "toml-checklist-only"
    When I run howdone with arguments "tasks.md --tree --no-truncate --format percentage --precision 2 --show-trailing-zeros"
    Then the command succeeds
    And stdout contains "Overall completion: 66.67%"
    And stdout contains "[100.00%] publish"

  Scenario: Invalid YAML frontmatter is a parser error
    Given a Markdown file containing:
      """
      ---
      invalid: [true
      ---
      """
    When I run howdone with arguments "tasks.md --json"
    Then the command fails
    And stderr contains "Invalid yaml frontmatter"
    And stdout is empty

  Scenario: A mixed frontmatter object is not a checklist
    Given the frontmatter fixture "yaml-mixed-object-is-not-checklist"
    When I run howdone with arguments "tasks.md --json"
    Then the command succeeds
    And stdout is valid JSON

  Scenario: Named YAML sequences form one semantic checklist
    Given the frontmatter fixture "yaml-named-boolean-sequence"
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stdout is valid JSON

  Scenario Outline: Named containers may lead to unnamed sequence branches
    Given the frontmatter fixture "<fixture>"
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stdout is valid JSON

    Examples:
      | fixture                                      |
      | yaml-named-container-with-unnamed-sequence   |
      | toml-named-container-with-unnamed-sequence   |

  Scenario: An unnamed sequence cannot return to a named record
    Given the frontmatter fixture "yaml-mixed-named-and-unnamed-sequence"
    When I run howdone with arguments "tasks.md --json"
    Then the command succeeds
    And stdout is valid JSON

  Scenario: A YAML root sequence is ignored to avoid an unnamed root checklist
    Given the frontmatter fixture "yaml-root-sequence-is-not-checklist"
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stdout is valid JSON

  Scenario Outline: Root boolean mappings are ignored without a named record
    Given the frontmatter fixture "<fixture>"
    When I run howdone with arguments "tasks.md --json"
    Then the command succeeds
    And stdout is valid JSON

    Examples:
      | fixture                               |
      | yaml-root-boolean-map-is-not-checklist |
      | toml-root-boolean-map-is-not-checklist |

  Scenario: A non-boolean YAML sequence leaf invalidates its named candidate
    Given the frontmatter fixture "yaml-named-boolean-sequence-with-invalid-leaf"
    When I run howdone with arguments "tasks.md --json"
    Then the command succeeds
    And stdout is valid JSON

  Scenario Outline: Invalid nested sequence candidates are ignored as a whole
    Given the frontmatter fixture "<fixture>"
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stderr is empty
    And stdout is valid JSON

    Examples:
      | fixture                                                |
      | yaml-named-boolean-sequence-with-empty-nested-list     |
      | toml-named-boolean-sequence-with-invalid-leaf          |

  Scenario: A single named YAML record becomes one leaf checklist
    Given the frontmatter fixture "yaml-single-named-record"
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stderr is empty
    And stdout is valid JSON

  Scenario: Legal nested TOML arrays form one named semantic checklist
    Given the frontmatter fixture "toml-named-boolean-sequence"
    When I run howdone with arguments "tasks.md --tree --no-truncate"
    Then the command succeeds
    And stdout contains "Overall completion: 75%"
    And stdout contains "0.0"

  Scenario: Named YAML records form a semantic checklist
    Given the frontmatter fixture "yaml-named-checklist"
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stdout is valid JSON

  Scenario: Named TOML records form a semantic checklist
    Given the frontmatter fixture "toml-named-checklist"
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stdout is valid JSON

  Scenario Outline: Root named records are valid Checklist entries
    Given the frontmatter fixture "<fixture>"
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stdout is valid JSON

    Examples:
      | fixture                   |
      | yaml-root-named-record    |
      | toml-root-named-record   |

  Scenario Outline: Named records ignore extra fields when name and done are valid
    Given the frontmatter fixture "<fixture>"
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stdout is valid JSON

    Examples:
      | fixture                              |
      | yaml-named-record-with-extra-fields  |
      | toml-named-record-with-extra-fields  |

  Scenario: Nested YAML fields on a named record do not create child items
    Given a Markdown file containing:
      """
      ---
      release_item:
        name: Build documentation
        done: true
        details:
          child: false
      ---
      """
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stdout is valid JSON

  Scenario: Nested TOML fields on a named record do not create child items
    Given a Markdown file containing:
      """
      +++
      [release_item]
      name = "Build documentation"
      done = true

      [release_item.details]
      child = false
      +++
      """
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stdout is valid JSON

  Scenario: One invalid named record invalidates its TOML record candidate
    Given the frontmatter fixture "toml-named-checklist-with-invalid-record"
    When I run howdone with arguments "tasks.md --json"
    Then the command succeeds
    And stdout is valid JSON

  Scenario: Valid named YAML candidates survive invalid siblings
    Given the frontmatter fixture "yaml-mixed-root-keeps-valid-named-candidates"
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stdout is valid JSON

  Scenario: TOML rejects a mixed scalar array before semantic classification
    Given the frontmatter fixture "toml-mixed-array-is-syntax-error"
    When I run howdone with arguments "tasks.md --json"
    Then the command fails
    And stderr contains "Invalid toml frontmatter"
    And stderr contains "single type"
