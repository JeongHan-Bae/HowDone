Feature: Frontmatter merge and weight warnings
  These scenarios prove merge and weight warning policy, including silent and strict modes.

  Scenario Outline: Illegal frontmatter weights warn and leave the normal merge result
    Given the frontmatter fixture "yaml-checklist-with-body"
    When I run howdone with arguments "tasks.md --json --merge-frontmatter --frontmatter-weight <weight> <extra>"
    Then the command succeeds
    And stderr contains "Warning"
    And stderr contains "frontmatter-weight is illegal"
    And stdout is valid JSON
    And stdout JSON reports presentation "merged"
    And stdout JSON reports progress "0.6666666666666666" and percentage "66.66666666666666"

    Examples:
      | weight | extra                  |
      | 0      |                        |
      | 0      | --max-label-clusters 5 |
      | 1      |                        |
      | 1      | --max-label-clusters 5 |
      | -0.5   |                        |
      | -0.5   | --max-label-clusters 5 |
      | 1.5    |                        |
      | 1.5    | --max-label-clusters 5 |
      | nope   |                        |
      | nope   | --max-label-clusters 5 |

  Scenario Outline: Silent mode suppresses an illegal frontmatter weight warning
    Given the frontmatter fixture "yaml-checklist-with-body"
    When I run howdone with arguments "tasks.md --json --merge-frontmatter --frontmatter-weight 0 --silent <extra>"
    Then the command succeeds
    And stderr is empty
    And stdout is valid JSON
    And stdout JSON reports presentation "merged"
    And stdout JSON reports progress "0.6666666666666666" and percentage "66.66666666666666"

    Examples:
      | extra                  |
      |                        |
      | --max-label-clusters 5 |

  Scenario Outline: Strict mode rejects an illegal frontmatter weight
    Given the frontmatter fixture "yaml-checklist-with-body"
    When I run howdone with arguments "tasks.md --json --merge-frontmatter --frontmatter-weight 0 --strict <extra>"
    Then the command fails
    And stderr contains "frontmatter-weight is illegal"

    Examples:
      | extra                  |
      |                        |
      | --max-label-clusters 5 |

  Scenario: A valid frontmatter weight without merge is warned and ignored
    Given the frontmatter fixture "yaml-checklist-with-body"
    When I run howdone with arguments "tasks.md --json --frontmatter-weight 0.5"
    Then the command succeeds
    And stderr contains "Warning"
    And stderr contains "frontmatter-weight is invalid without --merge-frontmatter"
    And stdout is valid JSON
    And stdout JSON reports presentation "separate"
    And stdout JSON reports progress "0.6666666666666666" and percentage "66.66666666666666"

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
    And stdout JSON reports presentation "merged"
    And stdout JSON reports progress "0.6666666666666666" and percentage "66.66666666666666"
    And stdout JSON reports frontmatter weight "0.5"

  Scenario: Explicit frontmatter merge weighting overrides root counts
    Given the frontmatter fixture "yaml-checklist-with-body"
    When I run howdone with arguments "tasks.md --json --merge-frontmatter --frontmatter-weight 0.5 --format decimal --precision 4 --show-trailing-zeros"
    Then the command succeeds
    And stderr contains "Warning"
    And stderr contains "have no effect with --json"
    And stdout is valid JSON
    And stdout JSON reports presentation "merged"
    And stdout JSON reports progress "0.6666666666666666" and percentage "66.66666666666666"
    And stdout JSON reports frontmatter weight "0.5"

  Scenario: A single frontmatter component warns when merge is requested
    Given the frontmatter fixture "yaml-checklist-only"
    When I run howdone with arguments "tasks.md --json --merge-frontmatter --frontmatter-weight 0.5"
    Then the command succeeds
    And stderr contains "Warning"
    And stderr contains "at least two source components"
    And stdout is valid JSON
    And stdout JSON reports progress "0.3333333333333333" and percentage "33.33333333333333"

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
    And stdout JSON reports progress "0.5" and percentage "50"

  Scenario: Strict mode rejects a single Markdown merge component
    Given the frontmatter fixture "body-only"
    When I run howdone with arguments "tasks.md --json --merge-frontmatter --strict"
    Then the command fails
    And stderr contains "at least two source components"
