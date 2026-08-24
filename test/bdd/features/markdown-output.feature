Feature: Markdown output contracts
  These scenarios prove the observable output contracts and label-display policy.

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

  Scenario: Details mode reports a nested contract through the real CLI
    Given the nested contract Markdown fixture
    When I run howdone with arguments "tasks.md --details --no-truncate"
    Then the command succeeds
    And stdout contains "Overall completion: 75%"
    And stdout contains "Level 3: 2 nodes, 2 leaf nodes, 0 branch nodes"
    And stdout contains "Release: 75%, 2 child nodes"

  Scenario: JSON mode exposes numeric completion fields
    Given a Markdown file containing:
      """
      - [x] done
      """
    When I run howdone with arguments "tasks.md --json"
    Then the command succeeds
    And stderr is empty
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
    And stderr is empty
    And stdout contains "\"label\": \"12345...\""

  Scenario: JSON mode keeps nested labels complete by default
    Given the nested contract Markdown fixture
    When I run howdone with arguments "tasks.md --json"
    Then the command succeeds
    And stdout is valid JSON
    And stdout JSON reports progress "0.75" and percentage "75"
    And stdout contains "\"label\": \"Completed child\""

  Scenario: JSON explicit label length enables truncation
    Given the nested contract Markdown fixture
    When I run howdone with arguments "tasks.md --json --max-label-clusters 5"
    Then the command succeeds
    And stdout is valid JSON
    And stdout contains "\"label\": \"Relea...\""
    And stdout contains "\"label\": \"Compl...\""

  Scenario: JSON explicit truncation and no-truncate conflict
    Given the nested contract Markdown fixture
    When I run howdone with arguments "tasks.md --json --max-label-clusters 5 --no-truncate --silent"
    Then the command fails
    And stderr contains "mutually exclusive"

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
