Feature: Markdown task syntax semantics
  These scenarios prove Markdown task recognition and source-boundary exclusions.

  Scenario Outline: Formatter-shaped blocks after body content remain Markdown
    Given the frontmatter layout fixture "<fixture>"
    When I run howdone with arguments "tasks.md --json"
    Then the command succeeds
    And stderr is empty
    And stdout is valid JSON

    Examples:
      | fixture                                  |
      | yaml-shaped-block-after-body-is-markdown |
      | toml-shaped-block-after-body-is-markdown |

  Scenario: Uppercase Markdown task markers are complete
    Given a Markdown file containing:
      """
      - [X] complete
      - [ ] pending
      """
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stderr is empty
    And stdout is valid JSON

  Scenario: Malformed Markdown task markers are ignored
    Given a Markdown file containing:
      """
      - [-] unsupported
      - [ x] wrong spacing
      - [x] valid
      """
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stderr is empty
    And stdout is valid JSON

  Scenario: Indented code HTML and comments do not create Markdown tasks
    Given a Markdown file containing:
      """
      - [x] valid

      Paragraph

          - [x] indented code

      <div>
      - [x] html text
      </div>

      <!--
      - [x] comment text
      -->
      """
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stderr is empty
    And stdout is valid JSON

  Scenario: Checkbox-looking Markdown text outside task syntax is ignored
    Given a Markdown file containing:
      """
      # Text

      A quoted string: "- [x] ordinary text"

      > - [x] quoted text

      | state | value |
      | --- | --- |
      | build | [x] |

      ~~~markdown
      - [x] code text
      ~~~
      """
    When I run howdone with arguments "tasks.md --json"
    Then the command succeeds
    And stderr is empty
    And stdout is valid JSON
