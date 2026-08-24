Feature: JSON formatting warnings
  These scenarios prove JSON display-option warnings and their silent and strict branches.

  Scenario: JSON mode ignores terminal formatting options with a warning
    Given a Markdown file containing:
      """
      - [x] 123456789012345
      """
    When I run howdone with arguments "tasks.md --json --format decimal --precision 3 --show-trailing-zeros --max-label-clusters 5"
    Then the command succeeds
    And stderr contains "Warning"
    And stderr contains "have no effect with --json" exactly once
    And stdout contains "\"label\": \"12345...\""

  Scenario Outline: Each JSON-only formatting conflict warns when combined
    Given a Markdown file containing:
      """
      - [x] done
      """
    When I run howdone with arguments "tasks.md --json <option>"
    Then the command succeeds
    And stderr contains "Warning"
    And stderr contains "have no effect with --json" exactly once

    Examples:
      | option                    |
      | --format decimal          |
      | --precision 3             |
      | --show-trailing-zeros    |

  Scenario Outline: Each terminal formatting option is quiet without JSON
    Given a Markdown file containing:
      """
      - [x] done
      """
    When I run howdone with arguments "tasks.md <option>"
    Then the command succeeds
    And stderr is empty

    Examples:
      | option                 |
      | --format decimal       |
      | --precision 3          |
      | --show-trailing-zeros  |

  Scenario Outline: JSON precision warning remains visible with a safe extra option
    Given a Markdown file containing:
      """
      - [x] done
      """
    When I run howdone with arguments "tasks.md --json --precision 3 <extra>"
    Then the command succeeds
    And stderr contains "Warning"
    And stderr contains "have no effect with --json" exactly once
    And stdout is valid JSON

    Examples:
      | extra                     |
      |                           |
      | --max-label-clusters 5    |

  Scenario Outline: Silent mode swallows a JSON precision warning with a safe extra option
    Given a Markdown file containing:
      """
      - [x] done
      """
    When I run howdone with arguments "tasks.md --json --precision 3 --silent <extra>"
    Then the command succeeds
    And stderr is empty
    And stdout is valid JSON

    Examples:
      | extra                     |
      |                           |
      | --max-label-clusters 5    |

  Scenario Outline: Strict mode upgrades a JSON precision warning with a safe extra option
    Given a Markdown file containing:
      """
      - [x] done
      """
    When I run howdone with arguments "tasks.md --json --precision 3 --strict <extra>"
    Then the command fails
    And stderr contains "have no effect with --json"

    Examples:
      | extra                     |
      |                           |
      | --max-label-clusters 5    |

  Scenario Outline: JSON remains quiet without the warning trigger and with a safe extra option
    Given a Markdown file containing:
      """
      - [x] done
      """
    When I run howdone with arguments "tasks.md --json <extra>"
    Then the command succeeds
    And stderr is empty
    And stdout is valid JSON

    Examples:
      | extra                     |
      |                           |
      | --max-label-clusters 5    |

  Scenario: JSON no-truncate is a no-op without a warning
    Given the nested contract Markdown fixture
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stderr is empty
    And stdout is valid JSON
    And stdout JSON reports progress "0.75" and percentage "75"
    And stdout contains "\"label\": \"Completed child\""

  Scenario: Silent mode suppresses ignored JSON formatting warnings
    Given a Markdown file containing:
      """
      - [x] done
      """
    When I run howdone with arguments "tasks.md --json --format decimal --precision 3 --show-trailing-zeros --silent"
    Then the command succeeds
    And stderr is empty
    And stdout is valid JSON

  Scenario: Strict mode rejects ignored JSON formatting options
    Given a Markdown file containing:
      """
      - [x] done
      """
    When I run howdone with arguments "tasks.md --json --format decimal --precision 3 --show-trailing-zeros --strict"
    Then the command fails
    And stderr contains "have no effect with --json"
