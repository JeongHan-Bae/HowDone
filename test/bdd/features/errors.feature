Feature: CLI errors and hard conflicts
  These scenarios prove filesystem, argument, and hard option errors.

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

  Scenario: Decimal precision below one is rejected through the CLI
    Given a Markdown file containing:
      """
      - [x] done
      """
    When I run howdone with arguments "tasks.md --format decimal --precision 0 --show-trailing-zeros"
    Then the command fails
    And stderr contains "at least 1"

  Scenario Outline: Unconditional terminal feature modes are rejected
    Given a Markdown file containing:
      """
      - [x] done
      """
    When I run howdone with arguments "tasks.md <terminal_option>"
    Then the command fails
    And stderr contains "Unknown option"

    Examples:
      | terminal_option |
      | --color         |
      | --pager         |

  Scenario: JSON explicit truncation and no-truncate conflict
    Given the nested contract Markdown fixture
    When I run howdone with arguments "tasks.md --json --max-label-clusters 5 --no-truncate --silent"
    Then the command fails
    And stderr contains "mutually exclusive"

  Scenario Outline: Hard conflicts stay errors with warning policy flags and safe options
    Given a Markdown file containing:
      """
      - [x] complete
      """
    When I run howdone with arguments "tasks.md <conflict> <modifier>"
    Then the command fails
    And stderr contains "mutually exclusive"

    Examples:
      | conflict                              | modifier          |
      | --tree --json                         |                   |
      | --tree --json                         | --silent          |
      | --tree --json                         | --strict          |
      | --tree --json                         | --precision 3     |
      | --no-truncate --max-label-clusters 5  |                   |
      | --no-truncate --max-label-clusters 5  | --silent          |
      | --no-truncate --max-label-clusters 5  | --strict          |
      | --no-truncate --max-label-clusters 5  | --format decimal  |
      | --show-trailing-zeros --no-trailing-zeros |                |
      | --show-trailing-zeros --no-trailing-zeros | --silent        |
      | --show-trailing-zeros --no-trailing-zeros | --strict        |
      | --show-trailing-zeros --no-trailing-zeros | --precision 3   |

  Scenario: A missing option value is a user-facing command error
    Given a Markdown file containing:
      """
      - [x] complete
      """
    When I run howdone with arguments "tasks.md --precision"
    Then the command fails
    And stderr contains "--precision requires a value"

  Scenario Outline: JSON does not downgrade invalid display values
    Given a Markdown file containing:
      """
      - [x] complete
      """
    When I run howdone with arguments "tasks.md <arguments>"
    Then the command fails
    And stderr contains "<message>"
    And stdout is empty

    Examples:
      | arguments                                  | message                        |
      | --json --precision 101                     | 0 through 100                 |
      | --json --max-label-clusters 0              | positive                      |
      | --json --max-label-clusters=0              | positive                      |
      | --json --format decimal --precision 0     | at least 1                    |

  Scenario Outline: Frontmatter weight does not consume a following option
    Given a Markdown file containing:
      """
      - [x] complete
      """
    When I run howdone with arguments "tasks.md <arguments>"
    Then the command fails
    And stderr contains "--frontmatter-weight requires a value"

    Examples:
      | arguments                    |
      | --frontmatter-weight --tree  |
      | --frontmatter-weight --json  |
      | --frontmatter-weight --      |
      | --frontmatter-weight=--tree |

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
      | --no-truncate --max-label-clusters 5       | mutually exclusive             |
