Feature: Markdown display modes and formatting
  These scenarios cover the concise, tree, and details display controls for Markdown.

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
      | --format=decimal            | 0.5      |
      | --format percentage         | 50%      |
      | --format=percentage         | 50%      |
      | --percentage                | 50%      |
      | --format percentage --precision 2 --show-trailing-zeros | 50.00% |

  Scenario: Trailing-zero aliases select the documented visible form
    Given a Markdown file containing:
      """
      - [x] done
      - [ ] pending
      """
    When I run howdone with arguments "tasks.md --percentage --precision 2 --trim-trailing-zeros"
    Then the command succeeds
    And stdout equals "50%"

  Scenario: Concise mode composes decimal aliases, precision, and trailing zeroes
    Given a Markdown file containing:
      """
      - [x] done
      - [ ] pending
      """
    When I run howdone with arguments "tasks.md --decimal --precision=3 --show-trailing-zeros"
    Then the command succeeds
    And stderr is empty
    And stdout equals "0.500"

  Scenario: Concise mode composes decimal precision with hidden trailing zeroes
    Given a Markdown file containing:
      """
      - [x] done
      - [ ] pending
      """
    When I run howdone with arguments "tasks.md --decimal --precision 3 --no-trailing-zeros"
    Then the command succeeds
    And stderr is empty
    And stdout equals "0.5"

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

  Scenario: Tree mode composes equal-form display values
    Given a Markdown file containing:
      """
      - ParentLong
        - [x] ChildLong
        - [ ] pending
      """
    When I run howdone with arguments "tasks.md --tree --format=decimal --precision=2 --show-trailing-zeros --max-label-clusters=5"
    Then the command succeeds
    And stderr is empty
    And stdout contains "Overall completion: 0.50"
    And stdout contains "[0.50] Paren..."
    And stdout contains "[1.00] Child..."

  Scenario: Details mode composes percentage precision and explicit truncation
    Given a Markdown file containing:
      """
      - ParentLong
        - [x] ChildLong
        - [ ] pending
      """
    When I run howdone with arguments "tasks.md --details --format percentage --precision 0 --show-trailing-zeros --max-label-clusters 3"
    Then the command succeeds
    And stdout contains "Overall completion: 50%"
    And stdout contains "Par...: 50%"
