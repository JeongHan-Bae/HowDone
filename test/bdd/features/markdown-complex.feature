Feature: Complex Markdown composition
  These scenarios combine nested Markdown progress with multiple display controls.

  Scenario: Terminal label truncation accepts a CLI limit
    Given a Markdown file containing:
      """
      - [x] 123456789012345
      """
    When I run howdone with arguments "tasks.md --tree --max-label-clusters 5"
    Then the command succeeds
    And stdout contains "12345..."

  Scenario: A mixed Markdown document composes nested progress and display controls
    Given a Markdown file containing:
      """
      ---
      title: Release plan
      ---

      # Ignored heading

      - ReleaseLong
        - [x] DesignLong
        - SubsystemLong
          1. [x] API layer
          2. [ ] UI layer
        - [ ] DocsLong

      - [ ] Hotfix

      > - [x] Quoted task is ignored

      ```markdown
      - [x] Code task is ignored
      ```
      """
    When I run howdone with arguments "tasks.md --tree --format decimal --precision=3 --keep-trailing-zeros --max-label-clusters 6"
    Then the command succeeds
    And stdout contains "Overall completion: 0.250"
    And stdout contains "[0.500] Releas..."
    And stdout contains "[0.500] Subsys..."
    And stdout contains "[1.000] Design..."
    And stdout contains "[1.000] API la..."
    And stdout contains "[0.000] UI lay..."
    And stdout contains "[0.000] DocsLo..."
    And stdout contains "[0.000] Hotfix"
    And stdout does not contain "Quoted task"
    And stdout does not contain "Code task"
