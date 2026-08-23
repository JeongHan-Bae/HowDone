Feature: Markdown checkbox progress CLI
  The complete command behavior is observable through the boot entrypoint.

  Scenario: The fixed acceptance sample renders a progress tree
    Given a Markdown file containing:
      """
      - A
        - B
          - [x] C1
          - [ ] C2
        - [x] D
      """
    When I run howdone with arguments "tasks.md --tree"
    Then the command succeeds
    And stdout contains "Overall completion: 75%"
    And stdout contains "[75%] A"
    And stdout contains "[50%] B"
    And stdout contains "[100%] C1"
    And stdout contains "[0%] C2"
    And stdout contains "[100%] D"

  Scenario: Default mode reports only the overall percentage
    Given a Markdown file containing:
      """
      - [x] done
      - [ ] pending
    """
    When I run howdone with arguments "tasks.md"
    Then the command succeeds
    And stdout equals "50%"

  Scenario Outline: Default mode supports decimal and explicit percentage formats
    Given a Markdown file containing:
      """
      - [x] done
      - [ ] pending
      """
    When I run howdone with arguments "tasks.md <format_option>"
    Then the command succeeds
    And stdout equals "<expected>"

    Examples:
      | format_option              | expected |
      | --format decimal            | 0.5      |
      | --format percentage         | 50%      |
      | --format percentage --precision 2 --show-trailing-zeros | 50.00% |

  Scenario: Concise mode composes decimal aliases, precision, and trailing zeroes
    Given a Markdown file containing:
      """
      - [x] done
      - [ ] pending
      """
    When I run howdone with arguments "tasks.md --decimal --precision=3 --show-trailing-zeros"
    Then the command succeeds
    And stdout equals "0.500"

  Scenario: Tree mode composes format, precision, trailing zeroes, and label truncation
    Given a Markdown file containing:
      """
      - ParentLong
        - [x] ChildLong
        - [ ] pending
      """
    When I run howdone with arguments "tasks.md --tree --format decimal --precision 2 --show-trailing-zeros --max-label-clusters 5"
    Then the command succeeds
    And stdout contains "Overall completion: 0.50"
    And stdout contains "[0.50] Paren..."
    And stdout contains "[1.00] Child..."

  Scenario: Details mode composes percentage precision and no-truncate
    Given a Markdown file containing:
      """
      - ParentLong
        - [x] ChildLong
        - [ ] pending
      """
    When I run howdone with arguments "tasks.md --details --format percentage --precision 0 --show-trailing-zeros --max-label-clusters 3 --no-truncate"
    Then the command succeeds
    And stdout contains "Overall completion: 50%"
    And stdout contains "ParentLong: 50%"

  Scenario: JSON mode composes an explicit limit with no-truncate
    Given a Markdown file containing:
      """
      - [x] 123456789012345
      """
    When I run howdone with arguments "tasks.md --json --max-label-clusters 5 --no-truncate"
    Then the command succeeds
    And stdout contains "\"label\": \"123456789012345\""

  Scenario: Decimal precision below one is rejected through the CLI
    Given a Markdown file containing:
      """
      - [x] done
      """
    When I run howdone with arguments "tasks.md --format decimal --precision 0 --show-trailing-zeros"
    Then the command fails
    And stderr contains "at least 1"

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

  Scenario: JSON mode exposes numeric completion fields
    Given a Markdown file containing:
      """
      - [x] done
      """
    When I run howdone with arguments "tasks.md --json"
    Then the command succeeds
    And stdout contains "\"progress\": 1"
    And stdout contains "\"percentage\": 100"

  Scenario: JSON mode keeps complete labels by default
    Given a Markdown file containing:
      """
      - [x] 123456789012345
      """
    When I run howdone with arguments "tasks.md --json"
    Then the command succeeds
    And stdout contains "\"label\": \"123456789012345\""

  Scenario: JSON mode can truncate labels explicitly
    Given a Markdown file containing:
      """
      - [x] 123456789012345
      """
    When I run howdone with arguments "tasks.md --json --max-label-clusters 5"
    Then the command succeeds
    And stdout contains "\"label\": \"12345...\""

  Scenario: Unicode and space-containing paths are resolved by the platform adapter
    Given a Markdown file named "我的 tasks.md" containing:
      """
      - [x] 完成
    """
    When I run howdone with arguments "\"我的 tasks.md\""
    Then the command succeeds
    And stdout equals "100%"

  Scenario: Missing input is a command error
    Given an empty howdone workspace
    When I run howdone with arguments "missing.md"
    Then the command fails
    And stderr contains "file not found"

  Scenario Outline: Conflicting display modes are rejected
    Given a Markdown file containing:
      """
      - [x] done
      """
    When I run howdone with arguments "tasks.md <first_mode> <second_mode>"
    Then the command fails
    And stderr contains "mutually exclusive"

    Examples:
      | first_mode | second_mode |
      | --tree     | --details   |
      | --tree     | --json      |
      | --details  | --json      |

  Scenario: Terminal label truncation accepts a CLI limit
    Given a Markdown file containing:
      """
      - [x] 123456789012345
      """
    When I run howdone with arguments "tasks.md --tree --max-label-clusters 5"
    Then the command succeeds
    And stdout contains "12345..."
