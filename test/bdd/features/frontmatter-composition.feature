Feature: Frontmatter composition and merge behavior
  These scenarios prove source order, separate channels, and explicit frontmatter merging.

  Scenario: TOML and Markdown statistics merge in tree output
    Given the frontmatter fixture "toml-nested-checklist"
    When I run howdone with arguments "tasks.md --tree --merge-frontmatter --format percentage --precision 0 --show-trailing-zeros --max-label-clusters 3"
    Then the command succeeds
    And stdout contains "Overall completion: 75%"
    And stdout contains "[50%] rel..."
    And stdout contains "[100%] bod..."
    And stdout does not contain "Frontmatter (TOML):"

  Scenario: YAML and Markdown statistics merge only when requested
    Given the frontmatter fixture "yaml-nested-checklist"
    When I run howdone with arguments "tasks.md --json --merge-frontmatter --format decimal --precision 3 --show-trailing-zeros --no-truncate"
    Then the command succeeds
    And stdout is valid JSON

  Scenario: Body and frontmatter JSON keep overall and channel results
    Given the frontmatter fixture "yaml-checklist-with-body"
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stdout is valid JSON

  Scenario: Body and frontmatter tree output is grouped by source
    Given the frontmatter fixture "yaml-checklist-with-body"
    When I run howdone with arguments "tasks.md --tree --no-truncate --precision 0 --show-trailing-zeros"
    Then the command succeeds
    And stdout contains "Frontmatter (YAML):"
    And stdout contains "Markdown:"
    And stdout contains "[0%] test"
    And stdout contains "[100%] body"

  Scenario: Body and frontmatter details output is grouped by source
    Given the frontmatter fixture "yaml-checklist-with-body"
    When I run howdone with arguments "tasks.md --details --no-truncate --precision 0 --show-trailing-zeros"
    Then the command succeeds
    And stdout contains "Frontmatter (YAML):"
    And stdout contains "Markdown:"
    And stdout contains "Overall statistics:"

  Scenario: Merged details output uses one combined progress result
    Given the frontmatter fixture "yaml-checklist-with-body"
    When I run howdone with arguments "tasks.md --details --merge-frontmatter --no-truncate"
    Then the command succeeds
    And stdout contains "Overall completion: 66.67%"
    And stdout contains "- Root nodes: 2"
    And stdout contains "- checks: 33.33%, 3 child nodes"
    And stdout contains "- body: 100%, 0 child nodes"
    And stdout does not contain "Frontmatter (YAML):"
    And stdout does not contain "Markdown:"

  Scenario: Multiple frontmatter sections and a body keep three channels separate
    Given the frontmatter fixture "yaml-toml-multiple-with-body"
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stdout is valid JSON

  Scenario: Repeated and alternating frontmatter formats remain separate and aggregate roots
    Given the frontmatter fixture "yaml-toml-toml-yaml-with-body"
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stdout is valid JSON

  Scenario: Default frontmatter weighting uses all frontmatter roots across repeated formats
    Given the frontmatter fixture "yaml-toml-toml-yaml-with-body"
    When I run howdone with arguments "tasks.md --json --merge-frontmatter --no-truncate"
    Then the command succeeds
    And stdout is valid JSON

  Scenario: Multiple headers expose separate tree and details sections
    Given the frontmatter fixture "yaml-toml-toml-yaml-with-body"
    When I run howdone with arguments "tasks.md --tree --no-truncate"
    Then the command succeeds
    And stdout contains "Frontmatter (YAML):"
    And stdout contains "Frontmatter (TOML):"
    And stdout contains "Markdown:"
    And stdout contains "[100%] yaml_first"
    And stdout contains "[100%] toml_first"
    And stdout contains "[0%] toml_second"
    And stdout contains "[0%] yaml_last"

    When I run howdone with arguments "tasks.md --details --no-truncate"
    Then the command succeeds
    And stdout contains "Frontmatter (YAML):"
    And stdout contains "Frontmatter (TOML):"
    And stdout contains "- Root nodes: 2"
    And stdout contains "- toml_second: 0%, 1 child node"

  Scenario: Merged JSON keeps source sections and all merged roots
    Given the frontmatter fixture "yaml-toml-toml-yaml-with-body"
    When I run howdone with arguments "tasks.md --json --merge-frontmatter --no-truncate"
    Then the command succeeds
    And stdout is valid JSON

  Scenario: YAML YAML TOML formatter sections keep their source order
    Given the frontmatter fixture "yaml-yaml-toml-only"
    When I run howdone with arguments "tasks.md --tree --no-truncate"
    Then the command succeeds
    And stdout contains "Frontmatter (YAML):"
    And stdout contains "[100%] first"
    And stdout contains "[0%] second"
    And stdout contains "Frontmatter (TOML):"
    And stdout contains "[100%] third"

    When I run howdone with arguments "tasks.md --details --no-truncate"
    Then the command succeeds
    And stdout contains "- first: 100%, 1 child node"
    And stdout contains "- second: 0%, 1 child node"
    And stdout contains "- third: 100%, 1 child node"

    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stdout is valid JSON

  Scenario Outline: Mixed header orders use frontmatter-first merged JSON
    Given the frontmatter fixture "<fixture>"
    When I run howdone with arguments "tasks.md --json --merge-frontmatter --no-truncate"
    Then the command succeeds
    And stdout is valid JSON

    Examples:
      | fixture             | formats   | progress             | percentage           |
      | yaml-yaml-with-body | yaml,yaml | 0.6666666666666666   | 66.66666666666666    |
      | toml-yaml-with-body | toml,yaml | 0.3333333333333333   | 33.33333333333333    |

  Scenario Outline: Explicit frontmatter weight replaces the root-count share
    Given the frontmatter fixture "<fixture>"
    When I run howdone with arguments "tasks.md --json --merge-frontmatter --frontmatter-weight 0.5 --no-truncate"
    Then the command succeeds
    And stdout is valid JSON

    Examples:
      | fixture             | progress             | percentage           |
      | yaml-yaml-with-body | 0.75                 | 75                   |
      | toml-yaml-with-body | 0.25                 | 25                   |

  Scenario: Explicit frontmatter weight changes merged tree output
    Given the frontmatter fixture "yaml-yaml-with-body"
    When I run howdone with arguments "tasks.md --tree --merge-frontmatter --frontmatter-weight 0.5 --format percentage --precision 2 --show-trailing-zeros --no-truncate"
    Then the command succeeds
    And stderr is empty
    And stdout contains "Overall completion: 75.00%"
    And stdout contains "[100.00%] first"
    And stdout contains "[0.00%] second"
    And stdout contains "[100.00%] body"
    And stdout does not contain "Frontmatter (YAML):"
    And stdout does not contain "Markdown:"

  Scenario: Explicit frontmatter weight changes merged details output
    Given the frontmatter fixture "yaml-yaml-with-body"
    When I run howdone with arguments "tasks.md --details --merge-frontmatter --frontmatter-weight 0.5 --format percentage --precision 2 --show-trailing-zeros --no-truncate"
    Then the command succeeds
    And stderr is empty
    And stdout contains "Overall completion: 75.00%"
    And stdout contains "- Root nodes: 3"
    And stdout contains "- first: 100.00%, 1 child node"
    And stdout contains "- second: 0.00%, 1 child node"
    And stdout contains "- body: 100.00%, 0 child nodes"
    And stdout does not contain "Frontmatter (YAML):"
    And stdout does not contain "Markdown:"

  Scenario: YAML YAML merged tree keeps frontmatter before Markdown
    Given the frontmatter fixture "yaml-yaml-with-body"
    When I run howdone with arguments "tasks.md --tree --merge-frontmatter --no-truncate"
    Then the command succeeds
    And stdout contains "\u251c\u2500 [100%] first"
    And stdout contains "\u251c\u2500 [0%] second"
    And stdout contains "\u2514\u2500 [100%] body"

  Scenario: TOML YAML merged tree keeps frontmatter before Markdown
    Given the frontmatter fixture "toml-yaml-with-body"
    When I run howdone with arguments "tasks.md --tree --merge-frontmatter --no-truncate"
    Then the command succeeds
    And stdout contains "\u251c\u2500 [100%] first"
    And stdout contains "\u251c\u2500 [0%] second"
    And stdout contains "\u2514\u2500 [0%] body"

  Scenario: Multiple frontmatter sections and a body merge into one tree when requested
    Given the frontmatter fixture "yaml-toml-multiple-with-body"
    When I run howdone with arguments "tasks.md --tree --merge-frontmatter --precision 0 --show-trailing-zeros --no-truncate"
    Then the command succeeds
    And stdout contains "Overall completion: 33%"
    And stdout contains "[100%] build"
    And stdout contains "[0%] test"
    And stdout contains "[0%] Publish"
    And stdout does not contain "Frontmatter (YAML):"
    And stdout does not contain "Frontmatter (TOML):"

  Scenario: Multiple frontmatter sections accept an explicit body merge weight
    Given the frontmatter fixture "yaml-toml-multiple-with-body"
    When I run howdone with arguments "tasks.md --json --merge-frontmatter --frontmatter-weight 0.5 --no-truncate"
    Then the command succeeds
    And stdout is valid JSON

  Scenario: Two frontmatter sections can merge without a Markdown body
    Given the frontmatter fixture "yaml-toml-multiple-only"
    When I run howdone with arguments "tasks.md --json --merge-frontmatter --no-truncate"
    Then the command succeeds
    And stderr is empty
    And stdout is valid JSON

  Scenario: Two frontmatter sections merge into one tree without a Markdown body
    Given the frontmatter fixture "yaml-toml-multiple-only"
    When I run howdone with arguments "tasks.md --tree --merge-frontmatter --format percentage --precision 2 --show-trailing-zeros --no-truncate"
    Then the command succeeds
    And stderr is empty
    And stdout contains "Overall completion: 50.00%"
    And stdout contains "[100.00%] checks"
    And stdout contains "[100.00%] build"
    And stdout contains "[0.00%] checks"
    And stdout contains "[0.00%] test"
    And stdout does not contain "Frontmatter (YAML):"
    And stdout does not contain "Frontmatter (TOML):"

  Scenario: Two frontmatter sections merge into one details report without a Markdown body
    Given the frontmatter fixture "yaml-toml-multiple-only"
    When I run howdone with arguments "tasks.md --details --merge-frontmatter --format percentage --precision 2 --show-trailing-zeros --no-truncate"
    Then the command succeeds
    And stderr is empty
    And stdout contains "Overall completion: 50.00%"
    And stdout contains "- Root nodes: 2"
    And stdout contains "- checks: 100.00%, 1 child node"
    And stdout contains "- checks: 0.00%, 1 child node"
    And stdout does not contain "Frontmatter (YAML):"
    And stdout does not contain "Frontmatter (TOML):"
