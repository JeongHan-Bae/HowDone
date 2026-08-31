Feature: Frontmatter merge and weight diagnostics
  These scenarios prove hard invalid-value errors and merge/weight warning policy.

  Scenario Outline: Illegal frontmatter weights are hard errors
    Given the frontmatter fixture "yaml-checklist-with-body"
    When I run howdone with arguments "tasks.md --json --merge-frontmatter --frontmatter-weight <weight> <extra>"
    Then the command fails
    And stderr contains "--frontmatter-weight must be a decimal strictly between 0 and 1"
    And stdout is empty

    Examples:
      | weight | extra                  |
      | 0      |                        |
      | 0      | --silent               |
      | 0      | --strict               |
      | 1      |                        |
      | -0.5   |                        |
      | 1.5    |                        |
      | nope   |                        |

  Scenario Outline: Equals-form illegal frontmatter weights are hard errors
    Given the frontmatter fixture "yaml-checklist-with-body"
    When I run howdone with arguments "tasks.md --json --merge-frontmatter --frontmatter-weight=<weight> <extra>"
    Then the command fails
    And stderr contains "--frontmatter-weight must be a decimal strictly between 0 and 1"
    And stdout is empty

    Examples:
      | weight | extra    |
      | 0      |          |
      | 1.5    | --silent |
      | nope   | --strict |

  Scenario: A valid frontmatter weight without merge is warned and ignored
    Given the frontmatter fixture "yaml-checklist-with-body"
    When I run howdone with arguments "tasks.md --json --frontmatter-weight 0.5"
    Then the command succeeds
    And stderr contains "Warning"
    And stderr contains "frontmatter-weight is invalid without --merge-frontmatter"
    And stdout is valid JSON

  Scenario: Strict mode rejects a valid frontmatter weight without merge
    Given the frontmatter fixture "yaml-checklist-with-body"
    When I run howdone with arguments "tasks.md --json --frontmatter-weight 0.5 --strict"
    Then the command fails
    And stderr contains "frontmatter-weight is invalid without --merge-frontmatter"

  Scenario Outline: A one-component merge warning remains visible with a safe extra option
    Given the frontmatter fixture "yaml-checklist-only"
    When I run howdone with arguments "tasks.md --merge-frontmatter <extra>"
    Then the command succeeds
    And stderr contains "Warning"
    And stderr contains "at least two source components" exactly once

    Examples:
      | extra                |
      |                      |
      | --format decimal     |

  Scenario Outline: Silent mode swallows a one-component merge warning with a safe extra option
    Given the frontmatter fixture "yaml-checklist-only"
    When I run howdone with arguments "tasks.md --merge-frontmatter --silent <extra>"
    Then the command succeeds
    And stderr is empty

    Examples:
      | extra                |
      |                      |
      | --format decimal     |

  Scenario Outline: Strict mode upgrades a one-component merge warning with a safe extra option
    Given the frontmatter fixture "yaml-checklist-only"
    When I run howdone with arguments "tasks.md --merge-frontmatter --strict <extra>"
    Then the command fails
    And stderr contains "at least two source components"

    Examples:
      | extra                |
      |                      |
      | --format decimal     |

  Scenario Outline: A valid multi-component merge stays quiet with a safe extra option
    Given the frontmatter fixture "yaml-toml-multiple-only"
    When I run howdone with arguments "tasks.md --merge-frontmatter <extra>"
    Then the command succeeds
    And stderr is empty

    Examples:
      | extra                |
      |                      |
      | --format decimal     |

  Scenario Outline: An unused frontmatter weight warning remains visible with a safe extra option
    Given the frontmatter fixture "yaml-checklist-with-body"
    When I run howdone with arguments "tasks.md --frontmatter-weight 0.5 <extra>"
    Then the command succeeds
    And stderr contains "Warning"
    And stderr contains "invalid without --merge-frontmatter" exactly once

    Examples:
      | extra                |
      |                      |
      | --format decimal     |

  Scenario Outline: Silent mode swallows an unused frontmatter weight warning with a safe extra option
    Given the frontmatter fixture "yaml-checklist-with-body"
    When I run howdone with arguments "tasks.md --frontmatter-weight 0.5 --silent <extra>"
    Then the command succeeds
    And stderr is empty

    Examples:
      | extra                |
      |                      |
      | --format decimal     |

  Scenario Outline: Strict mode upgrades an unused frontmatter weight warning with a safe extra option
    Given the frontmatter fixture "yaml-checklist-with-body"
    When I run howdone with arguments "tasks.md --frontmatter-weight 0.5 --strict <extra>"
    Then the command fails
    And stderr contains "invalid without --merge-frontmatter"

    Examples:
      | extra                |
      |                      |
      | --format decimal     |

  Scenario Outline: A valid frontmatter weight stays quiet with a safe extra option
    Given the frontmatter fixture "yaml-checklist-with-body"
    When I run howdone with arguments "tasks.md --merge-frontmatter --frontmatter-weight 0.5 <extra>"
    Then the command succeeds
    And stderr is empty

    Examples:
      | extra                |
      |                      |
      | --format decimal     |

  Scenario: Default frontmatter merge weighting uses root counts
    Given the frontmatter fixture "yaml-checklist-with-body"
    When I run howdone with arguments "tasks.md --json --merge-frontmatter"
    Then the command succeeds
    And stderr is empty
    And stdout is valid JSON

  Scenario: Equals-form frontmatter weight is applied to a valid merge
    Given the frontmatter fixture "yaml-checklist-with-body"
    When I run howdone with arguments "tasks.md --json --merge-frontmatter --frontmatter-weight=0.5"
    Then the command succeeds
    And stderr is empty
    And stdout is valid JSON

  Scenario: Explicit frontmatter merge weighting overrides root counts
    Given the frontmatter fixture "yaml-checklist-with-body"
    When I run howdone with arguments "tasks.md --json --merge-frontmatter --frontmatter-weight 0.5 --format decimal --precision 4 --show-trailing-zeros"
    Then the command succeeds
    And stderr contains "Warning"
    And stderr contains "have no effect with --json"
    And stdout is valid JSON

  Scenario: A single frontmatter component warns when merge is requested
    Given the frontmatter fixture "yaml-checklist-only"
    When I run howdone with arguments "tasks.md --json --merge-frontmatter --frontmatter-weight 0.5"
    Then the command succeeds
    And stderr contains "Warning"
    And stderr contains "at least two source components"
    And stdout is valid JSON

  Scenario: Strict mode rejects a single frontmatter merge component
    Given the frontmatter fixture "yaml-checklist-only"
    When I run howdone with arguments "tasks.md --json --merge-frontmatter --frontmatter-weight 0.5 --strict"
    Then the command fails
    And stderr contains "at least two source components"

  Scenario: A single Markdown component warns when merge is requested
    Given the frontmatter fixture "body-only"
    When I run howdone with arguments "tasks.md --json --merge-frontmatter"
    Then the command succeeds
    And stderr contains "Warning"
    And stderr contains "at least two source components"
    And stdout is valid JSON

  Scenario: Strict mode rejects a single Markdown merge component
    Given the frontmatter fixture "body-only"
    When I run howdone with arguments "tasks.md --json --merge-frontmatter --strict"
    Then the command fails
    And stderr contains "at least two source components"

  Scenario: A frontmatter weight is invalid when two headers have no Markdown side
    Given the frontmatter fixture "yaml-toml-multiple-only"
    When I run howdone with arguments "tasks.md --json --merge-frontmatter --frontmatter-weight 0.5 --no-truncate"
    Then the command succeeds
    And stderr contains "Warning"
    And stderr contains "frontmatter-weight is invalid unless both frontmatter and Markdown have checklist roots"
    And stdout is valid JSON

  Scenario: Silent mode suppresses a frontmatter weight warning without a Markdown side
    Given the frontmatter fixture "yaml-toml-multiple-only"
    When I run howdone with arguments "tasks.md --json --merge-frontmatter --frontmatter-weight 0.5 --silent --no-truncate"
    Then the command succeeds
    And stderr is empty
    And stdout is valid JSON

  Scenario: Strict mode rejects a frontmatter weight without a Markdown side
    Given the frontmatter fixture "yaml-toml-multiple-only"
    When I run howdone with arguments "tasks.md --json --merge-frontmatter --frontmatter-weight 0.5 --strict"
    Then the command fails
    And stderr contains "frontmatter-weight is invalid unless both frontmatter and Markdown have checklist roots"
