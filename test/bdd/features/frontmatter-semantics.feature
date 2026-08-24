Feature: Frontmatter checklist semantics
  These scenarios prove YAML and TOML checklist recognition and rejection boundaries.

  Scenario: Checkbox-looking Markdown text outside task syntax is ignored
    Given a Markdown file containing:
      """
      # Text

      A quoted string: "- [x] ordinary text"

      > - [x] quoted text

      | state | value |
      | --- | --- |
      | build | [x] |

      ```markdown
      - [x] code text
      ```
      """
    When I run howdone with arguments "tasks.md --json"
    Then the command succeeds
    And stderr is empty
    And stdout is valid JSON
    And stdout JSON reports progress "0" and percentage "0"
    And stdout contains "\"roots\": []"

  Scenario: TOML and Markdown statistics merge in tree output
    Given the frontmatter fixture "toml-nested-checklist"
    When I run howdone with arguments "tasks.md --tree --merge-frontmatter --format percentage --precision 0 --show-trailing-zeros --max-label-clusters 3"
    Then the command succeeds
    And stdout contains "Overall completion: 75%"
    And stdout contains "[50%] rel..."
    And stdout contains "[100%] bod..."
    And stdout does not contain "Frontmatter (TOML):"

  Scenario: A mixed frontmatter object is not a checklist
    Given the frontmatter fixture "yaml-mixed-object-is-not-checklist"
    When I run howdone with arguments "tasks.md --json"
    Then the command succeeds
    And stdout is valid JSON
    And stdout contains "\"progress\": 0"
    And stdout does not contain "\"type\": \"checklist\""

  Scenario: Named YAML sequences form one semantic checklist
    Given the frontmatter fixture "yaml-named-boolean-sequence"
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stdout is valid JSON
    And stdout JSON reports progress "0.625" and percentage "62.5"
    And stdout contains "\"label\": \"2.0\""

  Scenario Outline: Named containers may lead to unnamed sequence branches
    Given the frontmatter fixture "<fixture>"
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stdout is valid JSON
    And stdout JSON reports progress "0.625" and percentage "62.5"
    And stdout contains "checks"
    And stdout contains "named"
    And stdout contains "unnamed"
    And stdout contains "\"label\": \"0.0\""

    Examples:
      | fixture                                      |
      | yaml-named-container-with-unnamed-sequence   |
      | toml-named-container-with-unnamed-sequence   |

  Scenario: An unnamed sequence cannot return to a named record
    Given the frontmatter fixture "yaml-mixed-named-and-unnamed-sequence"
    When I run howdone with arguments "tasks.md --json"
    Then the command succeeds
    And stdout is valid JSON
    And stdout JSON reports progress "0" and percentage "0"
    And stdout does not contain "\"type\": \"checklist\""

  Scenario: A YAML root sequence is ignored to avoid an unnamed root checklist
    Given the frontmatter fixture "yaml-root-sequence-is-not-checklist"
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stdout is valid JSON
    And stdout JSON reports progress "0" and percentage "0"
    And stdout does not contain "\"type\": \"checklist\""

  Scenario Outline: Root boolean mappings are ignored without a named record
    Given the frontmatter fixture "<fixture>"
    When I run howdone with arguments "tasks.md --json"
    Then the command succeeds
    And stdout is valid JSON
    And stdout JSON reports progress "0" and percentage "0"
    And stdout does not contain "\"type\": \"checklist\""

    Examples:
      | fixture                               |
      | yaml-root-boolean-map-is-not-checklist |
      | toml-root-boolean-map-is-not-checklist |

  Scenario: A non-boolean YAML sequence leaf invalidates its named candidate
    Given the frontmatter fixture "yaml-named-boolean-sequence-with-invalid-leaf"
    When I run howdone with arguments "tasks.md --json"
    Then the command succeeds
    And stdout is valid JSON
    And stdout JSON reports progress "0" and percentage "0"
    And stdout does not contain "\"type\": \"checklist\""

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
    And stdout JSON reports progress "0.5" and percentage "50"
    And stdout contains "README describes CLI usage"

  Scenario: Named TOML records form a semantic checklist
    Given the frontmatter fixture "toml-named-checklist"
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stdout is valid JSON
    And stdout JSON reports progress "0.5" and percentage "50"
    And stdout contains "NPM README renders correctly"

  Scenario Outline: Root named records are valid Checklist entries
    Given the frontmatter fixture "<fixture>"
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stdout is valid JSON
    And stdout JSON reports progress "1" and percentage "100"
    And stdout contains "Root named task"

    Examples:
      | fixture                   |
      | yaml-root-named-record    |
      | toml-root-named-record   |

  Scenario Outline: Named records ignore extra fields when name and done are valid
    Given the frontmatter fixture "<fixture>"
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stdout is valid JSON
    And stdout JSON reports progress "1" and percentage "100"
    And stdout contains "Build documentation"

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
    And stdout JSON reports progress "1" and percentage "100"
    And stdout contains "Build documentation"
    And stdout does not contain "\"label\": \"child\""

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
    And stdout JSON reports progress "1" and percentage "100"
    And stdout contains "Build documentation"
    And stdout does not contain "\"label\": \"child\""

  Scenario: One invalid named record invalidates its TOML record candidate
    Given the frontmatter fixture "toml-named-checklist-with-invalid-record"
    When I run howdone with arguments "tasks.md --json"
    Then the command succeeds
    And stdout is valid JSON
    And stdout JSON reports progress "0" and percentage "0"
    And stdout does not contain "\"type\": \"checklist\""

  Scenario: Valid named YAML candidates survive invalid siblings
    Given the frontmatter fixture "yaml-mixed-root-keeps-valid-named-candidates"
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stdout is valid JSON
    And stdout JSON reports progress "0.5416666666666666" and percentage "54.166666666666664"
    And stdout contains "release_states"
    And stdout contains "release_checks"
    And stdout contains "release_items"
    And stdout does not contain "invalid_states"
    And stdout does not contain "invalid_object"

  Scenario: TOML rejects a mixed scalar array before semantic classification
    Given the frontmatter fixture "toml-mixed-array-is-syntax-error"
    When I run howdone with arguments "tasks.md --json"
    Then the command fails
    And stderr contains "Invalid toml frontmatter"
    And stderr contains "single type"
