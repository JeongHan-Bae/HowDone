Feature: Native path behavior
  These scenarios prove current-platform path construction and round-trip recognition.

  Scenario: Quoted space-containing paths are resolved by the platform adapter
    Given a Markdown file named "space tasks.md" containing:
      """
      - [x] complete
      """
    When I run howdone with arguments "\"space tasks.md\""
    Then the command succeeds
    And stdout equals "100%"

  Scenario: The .markdown extension is accepted through the real CLI
    Given a Markdown file named "tasks.markdown" containing:
      """
      - [x] complete
      """
    When I run howdone with arguments "tasks.markdown"
    Then the command succeeds
    And stdout equals "100%"

  Scenario: A second positional path is rejected by the real CLI
    Given a Markdown file containing:
      """
      - [x] first
      """
    And another Markdown file named "other.md" containing:
      """
      - [ ] second
      """
    When I run howdone with arguments "tasks.md other.md"
    Then the command fails
    And stderr contains "Only one Markdown file path may be provided"

  Scenario Outline: Native path variants round-trip through the CLI
    Given a Markdown fixture for native path variant "<path_kind>" containing:
      """
      - Parent
        - [x] first
        - [ ] second
      """
    When I run howdone with the native <path_kind> path and arguments "<options>"
    Then the command succeeds
    And stdout is valid JSON

    Examples:
      | path_kind       | options                                                                                 |
      | relative        | --json --format=percentage --precision 2 --show-trailing-zeros --max-label-clusters=10 |
      | relative-space  | --json --format=percentage --precision 2 --show-trailing-zeros --max-label-clusters=10 |
      | absolute        | --json --format decimal --precision=3 --keep-trailing-zeros --no-truncate              |
      | absolute-space  | --json --format decimal --precision=3 --keep-trailing-zeros --no-truncate              |

  Scenario: End-of-options preserves a leading-hyphen path
    Given a Markdown file named "-daily tasks.md" containing:
      """
      - [x] complete
      """
    When I run howdone with arguments "--json -- \"-daily tasks.md\""
    Then the command succeeds
    And stdout is valid JSON
