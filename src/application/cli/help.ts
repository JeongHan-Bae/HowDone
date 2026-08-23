export const HELP_TEXT = `Usage:
  howdone <markdown-path> [options]

Options:
  --format decimal|percentage
                           Format the overall progress value. The default is
                           an explicit percentage; --decimal is an alias.
  --percentage             Explicit percentage format (alias for --format percentage).
  --precision N            Decimal places: 0-100 for percentages, 1-100 for decimals.
  --show-trailing-zeros    Keep zeroes to the selected precision (hidden by default).
  --tree                   Show the statistical tree.
  --details                Show detailed statistics.
  --json                   Print the progress report as JSON.
  --max-label-clusters N   Keep at most N Unicode grapheme clusters per label.
  --no-truncate            Disable label truncation.
  -h, --help               Show this help message.
  -v, --version            Show the installed version.

Supported paths:
  Relative and absolute paths using the current platform's native path rules,
  including Unicode names and spaces. Only .md and .markdown files are read.

Calculation rules:
  A leaf checkbox is 100% when checked and 0% when unchecked.
  A branch averages its statistical children and ignores its own checkbox state.
  Plain list items with checkbox descendants become implicit statistical nodes.
  Overall completion is the equally weighted average of root nodes.

Default output:
  With only a Markdown path, howdone prints the overall percentage.

Display defaults:
  Percentage output defaults to 2 decimal places and decimal output defaults
  to 4; trailing zeroes are hidden by default. Use the CLI options above for
  one-command display changes.

Requirements:
  Node.js 23+ runs TypeScript natively. Node.js 18.18 through 22 uses the
  bundled tsx fallback. Node.js versions below 18.18 are unsupported.
`;
