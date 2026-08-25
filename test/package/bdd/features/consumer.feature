Feature: Published package consumer

  Scenario Outline: a consumer composes the published application ports
    Given a consumer provides ports for the "<case>" input
    When the consumer invokes the published application in "<mode>" mode
    Then the published application succeeds
    And the consumer file reader received the mapped path
    And the consumer warning port has no messages
    And consumer output contains the mapped percentage

    Examples:
      | case                 | mode     |
      | body-only-complete  | json     |
      | body-two-items      | terminal |
      | yaml-only           | json     |
      | yaml-plus-body      | terminal |
      | yaml-yaml-plus-body | json     |
      | yaml-toml-plus-body | terminal |
      | toml-only           | json     |
      | toml-yaml-plus-body | terminal |
      | toml-toml-plus-body | json     |

  Scenario: a consumer maps a warning through its JSON fixture pair
    Given a consumer provides ports for the "body-only-complete" input
    When the consumer invokes the published application with a JSON formatting option
    Then the published application succeeds
    And the consumer warning port matched "json-format-warning"
    And consumer output contains the mapped percentage
