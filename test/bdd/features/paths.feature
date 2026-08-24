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
    And stdout JSON has source path equal to the native <path_kind> path
    And stdout JSON reports progress "0.5" and percentage "50"
    And stdout JSON contains nested labels "Parent", "first", and "second"

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
    And stdout contains "\"path\": \"-daily tasks.md\""
