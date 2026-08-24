Feature: Markdown checkbox progress CLI
  The complete command behavior is observable through the boot entrypoint.

  Scenario: Help is available through the real CLI entrypoint
    Given an empty howdone workspace
    When I run howdone with arguments "--help"
    Then the command succeeds
    And stdout contains "Usage:"
    And stderr is empty

  Scenario: Version is available through the real CLI entrypoint
    Given an empty howdone workspace
    When I run howdone with arguments "--version"
    Then the command succeeds
    And stdout is a semantic version
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

  Scenario: Quoted space-containing paths are resolved by the platform adapter
    Given a Markdown file named "space tasks.md" containing:
      """
      - [x] complete
      """
    When I run howdone with arguments "\"space tasks.md\""
    Then the command succeeds
    And stdout equals "100%"

  Scenario: Missing input is a command error
    Given an empty howdone workspace
    When I run howdone with arguments "missing.md"
    Then the command fails
    And stderr contains "file not found"

  Scenario: A non-Markdown extension is rejected through the real CLI
    Given a file named "tasks.txt" containing:
      """
      - [x] complete
      """
    When I run howdone with arguments "tasks.txt"
    Then the command fails
    And stderr contains ".md or .markdown"

  Scenario: A Markdown directory is rejected through the real CLI
    Given a Markdown directory named "tasks.md"
    When I run howdone with arguments "tasks.md"
    Then the command fails
    And stderr contains "path is not a file"

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

  Scenario Outline: Conflicting aliases fail before a file is read
    Given a Markdown file containing:
      """
      - [x] complete
      """
    When I run howdone with arguments "tasks.md <first_option> <second_option>"
    Then the command fails
    And stderr contains "mutually exclusive"

    Examples:
      | first_option          | second_option          |
      | --decimal             | --percentage           |
      | --show-trailing-zeros | --no-trailing-zeros    |
      | --tree                | --json                 |

  Scenario: A missing option value is a user-facing command error
    Given a Markdown file containing:
      """
      - [x] complete
      """
    When I run howdone with arguments "tasks.md --precision"
    Then the command fails
    And stderr contains "--precision requires a value"

  Scenario Outline: Argument boundaries remain user-facing errors
    Given a Markdown file containing:
      """
      - [x] complete
      """
    When I run howdone with arguments "tasks.md <arguments>"
    Then the command fails
    And stderr contains "<message>"

    Examples:
      | arguments                                  | message                        |
      | --format=                                  | requires decimal or percentage |
      | --format --json                            | must be decimal or percentage  |
      | --precision=                               | requires a value               |
      | --precision --tree                         | non-negative integer            |
      | --precision 9007199254740992               | 0 through 100                  |
      | --max-label-clusters=                      | requires a value               |
      | --max-label-clusters --tree                | positive integer                |
      | --max-label-clusters 9007199254740992      | positive safe integer           |
