Feature: CLI diagnostic output

  Scenario: A JSON warning stays on stderr and leaves stdout as JSON
    Given a Markdown file containing:
      """
      - [x] done
      """
    When I run howdone with arguments "tasks.md --json --precision 2"
    Then the command succeeds
    And stderr contains "Warning:"
    And stderr contains "--precision"
    And stderr contains no terminal control sequences
    And stdout is valid JSON

  Scenario: Strict JSON warning becomes an error without corrupting stdout
    Given a Markdown file containing:
      """
      - [x] done
      """
    When I run howdone with arguments "tasks.md --json --precision 2 --strict"
    Then the command fails
    And stderr contains "howdone: error:"
    And stderr contains "--precision"
    And stderr contains no terminal control sequences
    And stdout is empty

  Scenario: A redirected terminal error remains plain
    Given a Markdown file containing:
      """
      - [x] done
      """
    When I run howdone with arguments "tasks.md --strict --frontmatter-weight 0.5 --no-color"
    Then the command fails
    And stderr contains "howdone: error:"
    And stderr contains "frontmatter-weight"
    And stderr contains no terminal control sequences
    And stdout is empty

  Scenario: An invalid argument keeps its code-styled usage hint plain when redirected
    Given an empty howdone workspace
    When I run howdone with arguments "--unknown"
    Then the command fails
    And stderr contains "Run `howdone --help` for usage."
    And stderr contains no terminal control sequences
    And stdout is empty
