Feature: Published package consumer

  Scenario Outline: a consumer composes custom published application ports
    Given a consumer provides custom ports for the "<case>" input
    When the consumer invokes the published application in "<mode>" mode
    Then the published application succeeds
    And the consumer file reader received the mapped path
    And the consumer terminal output has no diagnostics
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

  Scenario: a consumer combines a standard Core parser with custom ports
    Given a consumer provides the standard AST parser for the "body-two-items" input
    When the consumer invokes the published application in "terminal" mode
    Then the published application succeeds
    And the consumer file reader received the mapped path
    And the consumer terminal output has no diagnostics
    And consumer output contains the mapped percentage

  Scenario: a consumer receives terminal modes and resolved display options
    Given a consumer provides observable output ports for the "body-two-items" input
    When the consumer invokes the published application in all terminal modes with display options
    Then all terminal mode invocations succeed
    And the consumer received every terminal mode and resolved display option
    And every terminal report delivery targeted stdout

  Scenario: a consumer receives fallback report delivery without output hooks
    Given a consumer provides custom ports for the "body-two-items" input
    When the consumer invokes the published application with no optional output hooks
    Then fallback report delivery succeeds
    And fallback report delivery writes the exact terminal and JSON outputs

  Scenario: a consumer receives diagnostic fallback on stderr without a print hook
    Given a consumer provides fallback diagnostic ports for the "body-two-items" input
    When the consumer invokes the published application diagnostics without a print hook
    Then fallback diagnostic delivery returns warning success and strict error
    And fallback diagnostic delivery writes warning and error to stderr

  Scenario Outline: a consumer receives an error for every failing Core collaborator
    Given a consumer provides the failing "<failure>" port for the "<input>" input
    When the consumer invokes the published application in "<mode>" mode
    Then the published application fails
    And the consumer receives the "<message>" error diagnostic
    And the failing Core collaborator does not write report output

    Examples:
      | failure           | input                | mode     | message                         |
      | reader            | body-two-items       | terminal | consumer file reader failed     |
      | lexer             | body-two-items       | terminal | consumer lexer failed           |
      | parser             | body-two-items       | terminal | consumer parser failed           |
      | yaml-parser       | yaml-plus-body       | terminal | consumer YAML parser failed      |
      | toml-parser       | toml-toml-plus-body  | terminal | consumer TOML parser failed      |
      | terminal-renderer | body-two-items       | terminal | consumer terminal renderer failed |
      | json-renderer     | body-two-items       | json     | consumer JSON renderer failed   |
      | terminal-print   | body-two-items       | terminal | consumer terminal print failed  |
      | json-hook         | body-two-items       | json     | consumer JSON hook failed       |

  Scenario: a consumer reports an information Port failure
    Given a consumer provides the failing "info-port" port for the "body-two-items" input
    When the consumer invokes the published application information command
    Then the published application fails
    And the consumer receives the "consumer information Port failed" error diagnostic
    And the failing Core collaborator does not write report output

  Scenario: a consumer routes information documents through the terminal port
    Given a consumer provides custom ports for the "body-two-items" input
    When the consumer invokes the published application information commands
    Then the information commands succeed
    And the consumer received help, version, and dependency documents
    And the consumer information render received stdout target and no color
    And the consumer information commands did not read Markdown

  Scenario: a consumer maps a warning through its terminal output document
    Given a consumer provides diagnostic output ports
    When the consumer invokes the published application with a JSON formatting option
    Then the published application succeeds
    And the consumer terminal warning matched "json-format-warning"
    And consumer output contains the mapped percentage

  Scenario: a strict warning is not suppressed by the silent option
    Given a consumer provides diagnostic output ports
    When the consumer invokes the published application with strict and silent JSON formatting
    Then the published application fails
    And the consumer terminal error contains the JSON warning text

  Scenario: a consumer receives an invalid weight as a hard error
    Given a consumer provides diagnostic output ports
    When the consumer invokes the published application with an invalid frontmatter weight
    Then the published application fails
    And the consumer terminal error matched "invalid-frontmatter-weight"

  Scenario: a consumer composes mixed Core reports with merge weight and display options
    Given a consumer provides the mixed composition fixture
    When the consumer invokes the published application with merged weighted display options
    Then all mixed composition invocations succeed
    And the mixed composition reports match its fixture
    And the mixed composition output options match their fixture
    And exactly one selected output port was called for each mixed invocation

  Scenario: a consumer receives semantic diagnostics through terminal and JSON ports
    Given a consumer provides diagnostic output ports
    When the consumer invokes the published application diagnostics in terminal and JSON modes
    Then the terminal output port received warning and error semantics
    And the JSON port received no terminal diagnostics
    And both diagnostic invocations used automatic color

  Scenario Outline: a consumer preserves optional output capabilities
    Given a consumer provides the output capability fixture "<capability>"
    When the consumer invokes the published application in terminal and JSON modes
    Then all capability invocations succeed
    And consumer terminal delivery matches its output fixture
    And consumer JSON delivery matches its output fixture

    Examples:
      | capability |
      | 0000-aa       |
      | 0000-na       |
      | 0000-an       |
      | 0000-nn       |
      | 0001-aa       |
      | 0001-na       |
      | 0001-an       |
      | 0001-nn       |
      | 0010-aa       |
      | 0010-na       |
      | 0010-an       |
      | 0010-nn       |
      | 0011-aa       |
      | 0011-na       |
      | 0011-an       |
      | 0011-nn       |
      | 0100-aa       |
      | 0100-na       |
      | 0100-an       |
      | 0100-nn       |
      | 0101-aa       |
      | 0101-na       |
      | 0101-an       |
      | 0101-nn       |
      | 0110-aa       |
      | 0110-na       |
      | 0110-an       |
      | 0110-nn       |
      | 0111-aa       |
      | 0111-na       |
      | 0111-an       |
      | 0111-nn       |
      | 1000-aa       |
      | 1000-na       |
      | 1000-an       |
      | 1000-nn       |
      | 1001-aa       |
      | 1001-na       |
      | 1001-an       |
      | 1001-nn       |
      | 1010-aa       |
      | 1010-na       |
      | 1010-an       |
      | 1010-nn       |
      | 1011-aa       |
      | 1011-na       |
      | 1011-an       |
      | 1011-nn       |
      | 1100-aa       |
      | 1100-na       |
      | 1100-an       |
      | 1100-nn       |
      | 1101-aa       |
      | 1101-na       |
      | 1101-an       |
      | 1101-nn       |
      | 1110-aa       |
      | 1110-na       |
      | 1110-an       |
      | 1110-nn       |
      | 1111-aa       |
      | 1111-na       |
      | 1111-an       |
      | 1111-nn       |
