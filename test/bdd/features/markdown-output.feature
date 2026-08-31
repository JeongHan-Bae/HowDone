Feature: Markdown output contracts
  These scenarios prove the observable output contracts and label-display policy.

  Scenario: Details mode reports levels and root statistics
    Given a Markdown file containing:
      """
      - root
        - [x] child
      """
    When I run howdone with arguments "tasks.md --details"
    Then the command succeeds
    And stdout contains "Level 1: 1 node, 0 leaf nodes, 1 branch node"
    And stdout contains "Root statistics:"

  Scenario: Details mode reports a nested contract through the real CLI
    Given the nested contract Markdown fixture
    When I run howdone with arguments "tasks.md --details --no-truncate"
    Then the command succeeds
    And stdout contains "Overall completion: 75%"
    And stdout contains "Level 3: 2 nodes, 2 leaf nodes, 0 branch nodes"
    And stdout contains "Release: 75%, 2 child nodes"

  Scenario: Redirected tree output stays plain and preserves empty-line markers
    Given a Markdown file containing:
      """
      - [x] done
      """
    When I run howdone with arguments "tasks.md --tree"
    Then the command succeeds
    And stdout contains no terminal control sequences
    And stdout preserves terminal empty-line markers

  Scenario Outline: Redirected terminal feature switches compose without control sequences
    Given a Markdown file containing:
      """
      - [x] done
      """
    When I run howdone with arguments "tasks.md --tree <terminal_options>"
    Then the command succeeds
    And stdout contains no terminal control sequences
    And stdout preserves terminal empty-line markers

    Examples:
      | terminal_options              |
      | --no-color                    |
      | --no-pager                    |
      | --no-color --no-pager         |

  Scenario Outline: Global terminal switches compose with default and details output
    Given a Markdown file containing:
      """
      - [x] done
      - [ ] pending
      """
    When I run howdone with arguments "tasks.md <mode> --format percentage --precision 2 --show-trailing-zeros <terminal_options>"
    Then the command succeeds
    And stderr is empty
    And stdout contains no terminal control sequences
    And stdout contains "<expected>"

    Examples:
      | mode     | terminal_options      | expected                 |
      |          | --no-color            | 50.00%                   |
      |          | --no-pager            | 50.00%                   |
      |          | --no-color --no-pager | 50.00%                   |
      | --details | --no-color            | Overall completion: 50.00% |
      | --details | --no-pager            | Overall completion: 50.00% |
      | --details | --no-color --no-pager | Overall completion: 50.00% |

  Scenario: JSON mode exposes numeric completion fields
    Given a Markdown file containing:
      """
      - [x] done
      """
    When I run howdone with arguments "tasks.md --json"
    Then the command succeeds
    And stderr is empty
    And stdout is valid JSON

  Scenario: Grapheme truncation keeps clusters intact while JSON keeps complete labels
    Given the ASCII-escaped display fixture "unicode-grapheme-label"
    When I run howdone with the ASCII-escaped display fixture path and arguments "--tree --max-label-clusters 2"
    Then the command succeeds
    And stderr is empty
    And stdout contains "Overall completion: 100%"
    And stdout contains "[100%] \u{1f469}\u{200d}\u{1f4bb}\u{1f469}\u{200d}\u{1f4bb}..."

    When I run howdone with the ASCII-escaped display fixture path and arguments "--json"
    Then the command succeeds
    And stderr is empty
    And stdout is valid JSON

  Scenario: JSON mode keeps complete labels by default
    Given a Markdown file containing:
      """
      - [x] 123456789012345
      """
    When I run howdone with arguments "tasks.md --json"
    Then the command succeeds
    And stdout is valid JSON

  Scenario: JSON mode can truncate labels explicitly
    Given a Markdown file containing:
      """
      - [x] 123456789012345
      """
    When I run howdone with arguments "tasks.md --json --max-label-clusters 5"
    Then the command succeeds
    And stderr is empty
    And stdout is valid JSON

  Scenario: JSON mode keeps nested labels complete by default
    Given the nested contract Markdown fixture
    When I run howdone with arguments "tasks.md --json"
    Then the command succeeds
    And stdout is valid JSON

  Scenario: JSON exposes the complete nested progress result contract
    Given the nested contract Markdown fixture
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stdout is valid JSON

  Scenario Outline: JSON output remains machine-readable with terminal switches
    Given a Markdown file containing:
      """
      - [x] done
      """
    When I run howdone with arguments "tasks.md --json <terminal_options>"
    Then the command succeeds
    And stderr is empty
    And stdout is valid JSON

    Examples:
      | terminal_options      |
      | --no-color            |
      | --no-pager            |
      | --no-color --no-pager |

  Scenario: JSON explicit label length enables truncation
    Given the nested contract Markdown fixture
    When I run howdone with arguments "tasks.md --json --max-label-clusters 5"
    Then the command succeeds
    And stdout is valid JSON

  Scenario: Tree mode truncates long labels by default
    Given the frontmatter fixture "body-only"
    When I run howdone with arguments "tasks.md --tree"
    Then the command succeeds
    And stdout contains "[50%] ReleaseLon..."

  Scenario: Tree mode no-truncate preserves long labels
    Given the frontmatter fixture "body-only"
    When I run howdone with arguments "tasks.md --tree --no-truncate --format decimal --precision 2 --show-trailing-zeros"
    Then the command succeeds
    And stdout contains "[0.50] ReleaseLongLabel"
    And stdout contains "[1.00] CompletedLongLabel"

  Scenario: Tree mode accepts an explicit label length
    Given the frontmatter fixture "body-only"
    When I run howdone with arguments "tasks.md --tree --max-label-clusters 5"
    Then the command succeeds
    And stdout contains "[50%] Relea..."

  Scenario: Details mode truncates the root label by default
    Given the frontmatter fixture "body-only"
    When I run howdone with arguments "tasks.md --details"
    Then the command succeeds
    And stdout contains "ReleaseLon...: 50%, 2 child nodes"

  Scenario: Details mode no-truncate preserves the root label
    Given the frontmatter fixture "body-only"
    When I run howdone with arguments "tasks.md --details --no-truncate"
    Then the command succeeds
    And stdout contains "ReleaseLongLabel: 50%, 2 child nodes"

  Scenario: Details mode accepts an explicit label length
    Given the frontmatter fixture "body-only"
    When I run howdone with arguments "tasks.md --details --max-label-clusters 5"
    Then the command succeeds
    And stdout contains "Relea...: 50%, 2 child nodes"

  Scenario: Terminal label truncation accepts a CLI limit
    Given a Markdown file containing:
      """
      - [x] 123456789012345
      """
    When I run howdone with arguments "tasks.md --tree --max-label-clusters 5"
    Then the command succeeds
    And stdout contains "12345..."
