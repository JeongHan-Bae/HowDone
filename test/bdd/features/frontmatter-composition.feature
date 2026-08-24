Feature: Frontmatter composition and merge behavior
  These scenarios prove source order, separate channels, and explicit frontmatter merging.

  Scenario: Frontmatter after body content is invalid
    Given the frontmatter layout fixture "frontmatter-after-body-is-invalid"
    When I run howdone with arguments "tasks.md --json"
    Then the command fails
    And stderr contains "Frontmatter must appear before Markdown body content."

  Scenario: YAML booleans form a single-source semantic checklist in JSON
    Given the frontmatter fixture "yaml-checklist-only"
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stdout is valid JSON
    And stdout JSON reports progress "0.3333333333333333" and percentage "33.33333333333333"
    And stdout contains "\"label\": \"build\""

  Scenario: A frontmatter-only document keeps the concise percentage behavior
    Given the frontmatter fixture "yaml-checklist-only"
    When I run howdone with arguments "tasks.md"
    Then the command succeeds
    And stdout equals "33.33%"

  Scenario: TOML booleans form a separate semantic checklist in tree output
    Given the frontmatter fixture "toml-checklist-only"
    When I run howdone with arguments "tasks.md --tree --no-truncate --format percentage --precision 2 --show-trailing-zeros"
    Then the command succeeds
    And stdout contains "Overall completion: 66.67%"
    And stdout contains "[100.00%] publish"

  Scenario: YAML and Markdown statistics merge only when requested
    Given the frontmatter fixture "yaml-nested-checklist"
    When I run howdone with arguments "tasks.md --json --merge-frontmatter --format decimal --precision 3 --show-trailing-zeros --no-truncate"
    Then the command succeeds
    And stdout is valid JSON
    And stdout JSON reports presentation "merged"
    And stdout JSON reports progress "0.75" and percentage "75"
    And stdout JSON reports frontmatter "yaml" progress "0.5" and percentage "50"
    And stdout contains "\"label\": \"release\""
    And stdout contains "\"label\": \"body\""

  Scenario: Body and frontmatter JSON keep overall and channel results
    Given the frontmatter fixture "yaml-checklist-with-body"
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stdout is valid JSON
    And stdout JSON has keys "source,progress,presentation,frontmatter,markdown"
    And stdout JSON reports presentation "separate"
    And stdout JSON reports progress "0.6666666666666666" and percentage "66.66666666666666"
    And stdout JSON reports frontmatter "yaml" progress "0.3333333333333333" and percentage "33.33333333333333"
    And stdout contains "\"markdown\": {"

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

  Scenario: Multiple frontmatter sections and a body keep three channels separate
    Given the frontmatter fixture "yaml-toml-multiple-with-body"
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stdout is valid JSON
    And stdout JSON has keys "source,progress,presentation,frontmatter,markdown"
    And stdout JSON reports presentation "separate"
    And stdout JSON reports frontmatter formats "yaml,toml"
    And stdout JSON reports progress "0.3333333333333333" and percentage "33.33333333333333"

  Scenario: Repeated and alternating frontmatter formats remain separate and aggregate roots
    Given the frontmatter fixture "yaml-toml-toml-yaml-with-body"
    When I run howdone with arguments "tasks.md --json --no-truncate"
    Then the command succeeds
    And stdout is valid JSON
    And stdout JSON has keys "source,progress,presentation,frontmatter,markdown"
    And stdout JSON reports presentation "separate"
    And stdout JSON reports frontmatter formats "yaml,toml,toml,yaml"
    And stdout JSON reports progress "0.5" and percentage "50"

  Scenario: Default frontmatter weighting uses all frontmatter roots across repeated formats
    Given the frontmatter fixture "yaml-toml-toml-yaml-with-body"
    When I run howdone with arguments "tasks.md --json --merge-frontmatter --no-truncate"
    Then the command succeeds
    And stdout is valid JSON
    And stdout JSON reports presentation "merged"
    And stdout JSON reports frontmatter weight "0.8333333333333334"
    And stdout JSON reports progress "0.5" and percentage "50"

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
    And stdout contains "\"presentation\": \"merged\""
    And stdout contains "\"frontmatterWeight\": 0.8333333333333334"
    And stdout contains "\"rootCount\": 6"
    And stdout contains "\"label\": \"toml_second\""

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
    And stdout JSON has keys "source,progress,presentation,frontmatter"
    And stdout JSON reports frontmatter formats "yaml,yaml,toml"
    And stdout JSON reports progress "0.6666666666666666" and percentage "66.66666666666666"

  Scenario Outline: Mixed header orders use frontmatter-first merged JSON
    Given the frontmatter fixture "<fixture>"
    When I run howdone with arguments "tasks.md --json --merge-frontmatter --no-truncate"
    Then the command succeeds
    And stdout is valid JSON
    And stdout JSON has keys "source,progress,presentation,frontmatterWeight,frontmatter,markdown"
    And stdout JSON reports frontmatter formats "<formats>"
    And stdout JSON reports frontmatter weight "0.6666666666666666"
    And stdout JSON reports progress "<progress>" and percentage "<percentage>"

    Examples:
      | fixture             | formats   | progress             | percentage           |
      | yaml-yaml-with-body | yaml,yaml | 0.6666666666666666   | 66.66666666666666    |
      | toml-yaml-with-body | toml,yaml | 0.3333333333333333   | 33.33333333333333    |

  Scenario Outline: Explicit frontmatter weight replaces the root-count share
    Given the frontmatter fixture "<fixture>"
    When I run howdone with arguments "tasks.md --json --merge-frontmatter --frontmatter-weight 0.5 --no-truncate"
    Then the command succeeds
    And stdout is valid JSON
    And stdout JSON reports presentation "merged"
    And stdout JSON reports frontmatter weight "0.5"
    And stdout JSON reports progress "<progress>" and percentage "<percentage>"

    Examples:
      | fixture             | progress             | percentage           |
      | yaml-yaml-with-body | 0.75                 | 75                   |
      | toml-yaml-with-body | 0.25                 | 25                   |

  Scenario: YAML YAML merged tree keeps frontmatter before Markdown
    Given the frontmatter fixture "yaml-yaml-with-body"
    When I run howdone with arguments "tasks.md --tree --merge-frontmatter --no-truncate"
    Then the command succeeds
    And stdout contains "├─ [100%] first"
    And stdout contains "├─ [0%] second"
    And stdout contains "└─ [100%] body"

  Scenario: TOML YAML merged tree keeps frontmatter before Markdown
    Given the frontmatter fixture "toml-yaml-with-body"
    When I run howdone with arguments "tasks.md --tree --merge-frontmatter --no-truncate"
    Then the command succeeds
    And stdout contains "├─ [100%] first"
    And stdout contains "├─ [0%] second"
    And stdout contains "└─ [0%] body"

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
    And stdout JSON reports presentation "merged"
    And stdout JSON reports frontmatter weight "0.5"
    And stdout JSON reports progress "0.25" and percentage "25"

  Scenario: Two frontmatter sections can merge without a Markdown body
    Given the frontmatter fixture "yaml-toml-multiple-only"
    When I run howdone with arguments "tasks.md --json --merge-frontmatter --no-truncate"
    Then the command succeeds
    And stderr is empty
    And stdout is valid JSON
    And stdout JSON has keys "source,progress,presentation,frontmatter"
    And stdout JSON reports presentation "merged"
    And stdout JSON reports frontmatter formats "yaml,toml"
    And stdout JSON reports progress "0.5" and percentage "50"

  Scenario: A frontmatter weight is invalid when two headers have no Markdown side
    Given the frontmatter fixture "yaml-toml-multiple-only"
    When I run howdone with arguments "tasks.md --json --merge-frontmatter --frontmatter-weight 0.5 --no-truncate"
    Then the command succeeds
    And stderr contains "Warning"
    And stderr contains "frontmatter-weight is invalid unless both frontmatter and Markdown have checklist roots"
    And stdout is valid JSON
    And stdout JSON reports presentation "merged"
    And stdout JSON has keys "source,progress,presentation,frontmatter"

  Scenario: Silent mode suppresses a frontmatter weight warning
    Given the frontmatter fixture "yaml-toml-multiple-only"
    When I run howdone with arguments "tasks.md --json --merge-frontmatter --frontmatter-weight 0.5 --silent --no-truncate"
    Then the command succeeds
    And stderr is empty
    And stdout is valid JSON
    And stdout JSON reports presentation "merged"

  Scenario: Strict mode rejects a frontmatter weight without a Markdown side
    Given the frontmatter fixture "yaml-toml-multiple-only"
    When I run howdone with arguments "tasks.md --json --merge-frontmatter --frontmatter-weight 0.5 --strict"
    Then the command fails
    And stderr contains "frontmatter-weight is invalid unless both frontmatter and Markdown have checklist roots"
