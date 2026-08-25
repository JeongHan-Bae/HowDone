Feature: CLI basics and Markdown task trees
  These scenarios establish the ordinary CLI entrypoint and Markdown task-tree behavior.

  Scenario: Help is available through the real CLI entrypoint
    Given an empty howdone workspace
    When I run howdone with arguments "--help"
    Then the command succeeds
    And stdout contains "Usage:"
    And stdout contains "docs/syntax.md"
    And stdout contains "Node.js 18.18 or newer is required."
    And stdout contains every package.json runtime dependency
    And stdout does not contain "tsx"
    And stderr is empty

  Scenario: Version is available through the real CLI entrypoint
    Given an empty howdone workspace
    When I run howdone with arguments "--version"
    Then the command succeeds
    And stdout equals the package.json version
    And stderr is empty

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
