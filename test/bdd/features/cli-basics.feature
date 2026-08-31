Feature: CLI basics and Markdown task trees
  These scenarios establish the ordinary CLI entrypoint and Markdown task-tree behavior.

  Scenario: Help is available through the real CLI entrypoint
    Given an empty howdone workspace
    When I run howdone with arguments "--help"
    Then the command succeeds
    And stdout contains "Usage:"
    And stdout contains "howdone --help"
    And stdout contains "howdone --version"
    And stdout contains "howdone --dependencies"
    And stdout contains "docs/syntax.md"
    And stdout contains "Node.js 18.18 or newer is required."
    And stdout contains "--silent"
    And stdout contains "-s"
    And stdout contains "--strict"
    And stdout contains "--no-color"
    And stdout contains "--no-pager"
    And stdout contains every package.json runtime dependency
    And stdout does not contain "tsx"
    And stdout does not contain "-h, --help"
    And stdout does not contain "-v, --version"
    And stdout does not contain "docs/guide.md"
    And stderr is empty

  Scenario: Short help alias is available through the real CLI entrypoint
    Given an empty howdone workspace
    When I run howdone with arguments "-h --no-color --no-pager"
    Then the command succeeds
    And stdout contains "Usage:"
    And stderr is empty

  Scenario: Help renders CLI syntax as code and files as references
    Given an empty howdone workspace
    When I run howdone with arguments "--help"
    Then the command succeeds
    And stdout contains "`howdone --help`"
    And stdout contains "`--format` `decimal|percentage`"
    And stdout contains "`--option` `N` or `--option=N`"
    And stdout contains "overall percentage."
    And the "Default output" help section does not contain "`percentage`"
    And stdout does not contain "`docs/syntax.md`"
    And stdout does not contain "`chalk@"
    And stdout contains no terminal control sequences

  Scenario: Version is available through the real CLI entrypoint
    Given an empty howdone workspace
    When I run howdone with arguments "--version --no-color --no-pager"
    Then the command succeeds
    And stdout equals the package.json version
    And stdout does not contain "`"
    And stderr is empty

  Scenario: Short version alias is available through the real CLI entrypoint
    Given an empty howdone workspace
    When I run howdone with arguments "-v --no-color --no-pager"
    Then the command succeeds
    And stdout equals the package.json version
    And stderr is empty

  Scenario: Runtime dependencies are available as an independent command
    Given an empty howdone workspace
    When I run howdone with arguments "--dependencies --no-color --no-pager"
    Then the command succeeds
    And stdout contains every package.json runtime dependency
    And stdout does not contain "Usage:"
    And stdout does not contain "`"
    And stderr is empty

  Scenario Outline: Global output options are accepted by every standalone command
    Given an empty howdone workspace
    When I run howdone with arguments "<command> --silent --strict --no-color --no-pager"
    Then the command succeeds
    And stderr is empty

    Examples:
      | command         |
      | --help          |
      | --version       |
      | --dependencies  |

  Scenario: Standalone commands cannot be appended to Markdown analysis
    Given a Markdown file containing:
      """
      - [x] Complete
      """
    When I run howdone with arguments "tasks.md --help"
    Then the command fails
    And stderr contains "standalone command"

  Scenario Outline: Standalone commands reject path delimiters and other commands
    Given an empty howdone workspace
    When I run howdone with arguments "<arguments>"
    Then the command fails
    And stderr contains "standalone command"

    Examples:
      | arguments          |
      | --help --          |
      | --help --version   |
      | --dependencies -h |

  Scenario: A missing path is rejected through the real CLI entrypoint
    Given an empty howdone workspace
    When I run howdone with arguments ""
    Then the command fails
    And stderr contains "Markdown file path is required"

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

  Scenario: An explicit parent checkbox is calculated from its task children
    Given a Markdown file containing:
      """
      - [x] Release
        - [ ] Build
        - [x] Publish
      """
    When I run howdone with arguments "tasks.md --tree"
    Then the command succeeds
    And stdout contains "Overall completion: 50%"
    And stdout contains "[50%] Release"
    And stdout contains "[0%] Build"
    And stdout contains "[100%] Publish"

  Scenario: Ordered and unordered list trees keep task ancestors and discard plain branches
    Given a Markdown file containing:
      """
      1. Release
         * Notes with no checkbox
         * [x] Build
      2. Archive
         - [ ] Publish
      3. Discarded
         - Notes with no checkbox
      """
    When I run howdone with arguments "tasks.md --tree"
    Then the command succeeds
    And stdout contains "Overall completion: 50%"
    And stdout contains "[100%] Release"
    And stdout contains "[0%] Archive"
    And stdout does not contain "Discarded"
    And stdout does not contain "Notes with no checkbox"
