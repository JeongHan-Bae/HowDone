Feature: Frontmatter source layouts and output
  These scenarios prove frontmatter-only, body-only, and grouped source output.

  Scenario: YAML frontmatter without a body produces an empty JSON report
    Given the frontmatter fixture "yaml-only"
    When I run howdone with arguments "tasks.md --json --no-truncate --format decimal --precision 3 --show-trailing-zeros"
    Then the command succeeds
    And stdout is valid JSON
    And stdout JSON reports progress "0" and percentage "0"
    And stdout contains "\"roots\": []"

  Scenario: TOML frontmatter without a body produces empty details
    Given the frontmatter fixture "toml-only"
    When I run howdone with arguments "tasks.md --details --format decimal --precision 3 --show-trailing-zeros"
    Then the command succeeds
    And stdout contains "Overall completion: 0.000"
    And stdout contains "No statistical nodes found."

  Scenario: YAML frontmatter with a body preserves body tasks
    Given the frontmatter fixture "yaml-with-body"
    When I run howdone with arguments "tasks.md --tree --no-truncate --format percentage --precision 0 --show-trailing-zeros"
    Then the command succeeds
    And stdout contains "Overall completion: 50%"
    And stdout contains "[50%] ReleaseLongLabel"
    And stdout contains "[100%] CompletedLongLabel"
    And stdout does not contain "metadata_task"

  Scenario: TOML frontmatter with a body supports JSON truncation
    Given the frontmatter fixture "toml-with-body"
    When I run howdone with arguments "tasks.md --json --max-label-clusters 5 --format decimal --precision 3 --show-trailing-zeros"
    Then the command succeeds
    And stdout is valid JSON
    And stdout JSON reports progress "0.5" and percentage "50"
    And stdout contains "\"label\": \"Relea...\""
    And stdout contains "\"label\": \"Compl...\""

  Scenario: A body without frontmatter supports details truncation
    Given the frontmatter fixture "body-only"
    When I run howdone with arguments "tasks.md --details --max-label-clusters 5 --format percentage --precision 0 --show-trailing-zeros"
    Then the command succeeds
    And stdout contains "Overall completion: 50%"
    And stdout contains "Relea...: 50%, 2 child nodes"

  Scenario: An empty document is a legal document with no body or frontmatter
    Given the frontmatter layout fixture "empty-document"
    When I run howdone with arguments "tasks.md --json"
    Then the command succeeds
    And stdout is valid JSON
    And stdout JSON reports progress "0" and percentage "0"

  Scenario Outline: A single channel keeps the concise report shape
    Given the frontmatter layout fixture "<fixture>"
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stdout is valid JSON
    And stdout JSON has keys "source,progress"
    And stdout JSON reports progress "<progress>" and percentage "<percentage>"

    Examples:
      | fixture     | progress | percentage |
      | body-only   | 1        | 100        |
      | yaml-only   | 0        | 0          |
      | toml-only   | 0        | 0          |

  Scenario Outline: Body and frontmatter use grouped output
    Given the frontmatter layout fixture "<fixture>"
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stdout is valid JSON
    And stdout JSON has keys "source,progress,presentation,frontmatter,markdown"
    And stdout JSON reports progress "<progress>" and percentage "<percentage>"

    Examples:
      | fixture        | progress | percentage |
      | yaml-with-body | 1        | 100        |
      | toml-with-body | 0        | 0          |

  Scenario Outline: Multiple frontmatter-only sections preserve format order
    Given the frontmatter layout fixture "<fixture>"
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stdout is valid JSON
    And stdout JSON has keys "source,progress,presentation,frontmatter"
    And stdout JSON reports frontmatter formats "<formats>"
    And stdout JSON reports progress "<progress>" and percentage "<percentage>"

    Examples:
      | fixture                    | formats   | progress | percentage |
      | yaml-yaml-frontmatter-only | yaml,yaml | 0        | 0          |
      | yaml-toml-frontmatter-only | yaml,toml | 0        | 0          |
      | toml-yaml-frontmatter-only | toml,yaml | 0        | 0          |
      | toml-toml-frontmatter-only | toml,toml | 0        | 0          |

  Scenario Outline: Multiple frontmatter sections with a body keep source order
    Given the frontmatter layout fixture "<fixture>"
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stdout is valid JSON
    And stdout JSON has keys "source,progress,presentation,frontmatter,markdown"
    And stdout JSON reports frontmatter formats "<formats>"
    And stdout JSON reports progress "<progress>" and percentage "<percentage>"

    Examples:
      | fixture                  | formats        | progress | percentage |
      | yaml-toml-yaml-with-body | yaml,toml,yaml | 1        | 100        |
      | toml-yaml-toml-with-body | toml,yaml,toml | 0        | 0          |
