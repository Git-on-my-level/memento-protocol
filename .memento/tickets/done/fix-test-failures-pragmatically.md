I think we have too many tests and they're too brittle. This is a small CLI project, let's prioritize agility and maintainability

Here's the test failure logs
```
➜  memento-protocol git:(main) npm run test

> memento-protocol@0.1.0 test
> jest

 FAIL  src/lib/__tests__/logger-complete.test.ts
  ● logger complete coverage › should test all logger methods

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Info message"
    Received: "ℹ Info message"

    Number of calls: 1

      18 |     // Test info
      19 |     logger.info('Info message');
    > 20 |     expect(consoleLogSpy).toHaveBeenCalledWith('\x1b[36mInfo message\x1b[0m');
         |                           ^
      21 |
      22 |     // Test success
      23 |     logger.success('Success message');

      at Object.<anonymous> (src/lib/__tests__/logger-complete.test.ts:20:27)

 FAIL  src/lib/__tests__/logger.test.ts
  ● Console

    console.warn
      ⚠ Warning message

      37 |   
      38 |   warn: (message: string, ...args: any[]) => {
    > 39 |     console.warn(`${colors.yellow}⚠${colors.reset} ${message}`, ...args);
         |             ^
      40 |   },
      41 |   
      42 |   error: (message: string, error?: any) => {

      at Object.warn (src/lib/logger.ts:39:13)
      at Object.<anonymous> (src/lib/__tests__/logger.test.ts:35:14)

  ● logger › info › should log info messages with cyan color

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Test info message"
    Received: "ℹ Test info message"

    Number of calls: 1

      19 |       logger.info('Test info message');
      20 |       
    > 21 |       expect(consoleLogSpy).toHaveBeenCalledWith('\x1b[36mTest info message\x1b[0m');
         |                             ^
      22 |     });
      23 |   });
      24 |

      at Object.<anonymous> (src/lib/__tests__/logger.test.ts:21:29)

  ● logger › success › should log success messages with green checkmark

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "✓ Operation successful"
    Received: "✓ Operation successful"

    Number of calls: 1

      27 |       logger.success('Operation successful');
      28 |       
    > 29 |       expect(consoleLogSpy).toHaveBeenCalledWith('\x1b[32m✓ Operation successful\x1b[0m');
         |                             ^
      30 |     });
      31 |   });
      32 |

      at Object.<anonymous> (src/lib/__tests__/logger.test.ts:29:29)

  ● logger › warn › should log warning messages with yellow color

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "⚠ Warning message"

    Number of calls: 0

      35 |       logger.warn('Warning message');
      36 |       
    > 37 |       expect(consoleLogSpy).toHaveBeenCalledWith('\x1b[33m⚠ Warning message\x1b[0m');
         |                             ^
      38 |     });
      39 |   });
      40 |

      at Object.<anonymous> (src/lib/__tests__/logger.test.ts:37:29)

  ● logger › error › should log error messages with red cross

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "✗ Error occurred"
    Received: "✖ Error occurred"

    Number of calls: 1

      43 |       logger.error('Error occurred');
      44 |       
    > 45 |       expect(consoleErrorSpy).toHaveBeenCalledWith('\x1b[31m✗ Error occurred\x1b[0m');
         |                               ^
      46 |     });
      47 |   });
      48 |

      at Object.<anonymous> (src/lib/__tests__/logger.test.ts:45:31)

  ● logger › color support › should handle different message types

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Simple message"
    Received: "ℹ Simple message"

    Number of calls: 1

      59 |       messages.forEach(msg => {
      60 |         logger.info(msg);
    > 61 |         expect(consoleLogSpy).toHaveBeenCalledWith(`\x1b[36m${msg}\x1b[0m`);
         |                               ^
      62 |       });
      63 |     });
      64 |   });

      at src/lib/__tests__/logger.test.ts:61:31
          at Array.forEach (<anonymous>)
      at Object.<anonymous> (src/lib/__tests__/logger.test.ts:59:16)

 PASS  src/lib/__tests__/metadata-refactor.test.ts
 FAIL  src/commands/__tests__/add.test.ts
  ● Add Command › add mode › should handle installation errors

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Failed to add component: Component not found"
    Received: "Failed to add component:", [Error: Component not found]

    Number of calls: 1

      60 |       await addCommand.parseAsync(['node', 'test', 'mode', 'invalid']);
      61 |
    > 62 |       expect(logger.error).toHaveBeenCalledWith('Failed to add component: Component not found');
         |                            ^
      63 |       expect(process.exit).toHaveBeenCalledWith(1);
      64 |     });
      65 |   });

      at Object.<anonymous> (src/commands/__tests__/add.test.ts:62:28)

  ● Add Command › validation › should error when not initialized

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Memento Protocol is not initialized. Run \"memento init\" first."
    Received: "Memento Protocol is not initialized in this project."

    Number of calls: 1

      85 |       await addCommand.parseAsync(['node', 'test', 'mode', 'architect']);
      86 |
    > 87 |       expect(logger.error).toHaveBeenCalledWith('Memento Protocol is not initialized. Run "memento init" first.');
         |                            ^
      88 |       expect(process.exit).toHaveBeenCalledWith(1);
      89 |     });
      90 |

      at Object.<anonymous> (src/commands/__tests__/add.test.ts:87:28)

error: unknown option '--help'
(Did you mean --help?)
Usage: memento [options] [command]

A lightweight meta-framework for Claude Code

Options:
  -V, --version   output the version number
  -v, --verbose   enable verbose output
  -d, --debug     enable debug output
  -h, --help      display help for command

Commands:
  init            Initialize
  add             Add component
  list            List components
  ticket          Manage tickets
  config          Manage config
  update          Update components
  language        Manage languages
  help [command]  display help for command

Examples:
  $ memento init                    # Initialize Memento Protocol in a project
  $ memento add mode architect      # Add the architect mode
  $ memento add workflow review     # Add the code review workflow
  $ memento ticket create "auth"    # Create a ticket for authentication work
  $ memento list --installed        # Show installed components
  $ memento language                # Auto-detect and install language overrides

For Claude Code users:
  Say "act as architect" to switch to architect mode
  Say "execute review" to run the code review workflow
  Say "create ticket X" to start persistent work

For more information, visit: https://github.com/git-on-my-level/memento-protocol
Documentation: https://github.com/git-on-my-level/memento-protocol#readme
Usage: memento [options] [command]

A lightweight meta-framework for Claude Code

Options:
  -V, --version   output the version number
  -v, --verbose   enable verbose output
  -d, --debug     enable debug output
  -h, --help      display help for command

Commands:
  init            Initialize
  add             Add component
  list            List components
  ticket          Manage tickets
  config          Manage config
  update          Update components
  language        Manage languages
  help [command]  display help for command

Examples:
  $ memento init                    # Initialize Memento Protocol in a project
  $ memento add mode architect      # Add the architect mode
  $ memento add workflow review     # Add the code review workflow
  $ memento ticket create "auth"    # Create a ticket for authentication work
  $ memento list --installed        # Show installed components
  $ memento language                # Auto-detect and install language overrides

For Claude Code users:
  Say "act as architect" to switch to architect mode
  Say "execute review" to run the code review workflow
  Say "create ticket X" to start persistent work

For more information, visit: https://github.com/git-on-my-level/memento-protocol
Documentation: https://github.com/git-on-my-level/memento-protocol#readme
Usage: memento [options] [command]

A lightweight meta-framework for Claude Code

Options:
  -V, --version   output the version number
  -v, --verbose   enable verbose output
  -d, --debug     enable debug output
  -h, --help      display help for command

Commands:
  init            Initialize
  add             Add component
  list            List components
  ticket          Manage tickets
  config          Manage config
  update          Update components
  language        Manage languages
  help [command]  display help for command

Examples:
  $ memento init                    # Initialize Memento Protocol in a project
  $ memento add mode architect      # Add the architect mode
  $ memento add workflow review     # Add the code review workflow
  $ memento ticket create "auth"    # Create a ticket for authentication work
  $ memento list --installed        # Show installed components
  $ memento language                # Auto-detect and install language overrides

For Claude Code users:
  Say "act as architect" to switch to architect mode
  Say "execute review" to run the code review workflow
  Say "create ticket X" to start persistent work

For more information, visit: https://github.com/git-on-my-level/memento-protocol
Documentation: https://github.com/git-on-my-level/memento-protocol#readme
Usage: memento [options] [command]

A lightweight meta-framework for Claude Code

Options:
  -V, --version   output the version number
  -v, --verbose   enable verbose output
  -d, --debug     enable debug output
  -h, --help      display help for command

Commands:
  init            Initialize
  add             Add component
  list            List components
  ticket          Manage tickets
  config          Manage config
  update          Update components
  language        Manage languages
  help [command]  display help for command

Examples:
  $ memento init                    # Initialize Memento Protocol in a project
  $ memento add mode architect      # Add the architect mode
  $ memento add workflow review     # Add the code review workflow
  $ memento ticket create "auth"    # Create a ticket for authentication work
  $ memento list --installed        # Show installed components
  $ memento language                # Auto-detect and install language overrides

For Claude Code users:
  Say "act as architect" to switch to architect mode
  Say "execute review" to run the code review workflow
  Say "create ticket X" to start persistent work

For more information, visit: https://github.com/git-on-my-level/memento-protocol
Documentation: https://github.com/git-on-my-level/memento-protocol#readme
Usage: memento [options] [command]

A lightweight meta-framework for Claude Code

Options:
  -V, --version   output the version number
  -v, --verbose   enable verbose output
  -d, --debug     enable debug output
  -h, --help      display help for command

Commands:
  init            Initialize
  add             Add component
  list            List components
  ticket          Manage tickets
  config          Manage config
  update          Update components
  language        Manage languages
  help [command]  display help for command

Examples:
  $ memento init                    # Initialize Memento Protocol in a project
  $ memento add mode architect      # Add the architect mode
  $ memento add workflow review     # Add the code review workflow
  $ memento ticket create "auth"    # Create a ticket for authentication work
  $ memento list --installed        # Show installed components
  $ memento language                # Auto-detect and install language overrides

For Claude Code users:
  Say "act as architect" to switch to architect mode
  Say "execute review" to run the code review workflow
  Say "create ticket X" to start persistent work

For more information, visit: https://github.com/git-on-my-level/memento-protocol
Documentation: https://github.com/git-on-my-level/memento-protocol#readme
 FAIL  src/commands/__tests__/config.test.ts
  ● Test suite failed to run

    src/commands/__tests__/config.test.ts:75:48 - error TS2345: Argument of type '{ theme: string; }' is not assignable to parameter of type 'MementoConfig | Promise<MementoConfig>'.

    75       mockConfigManager.list.mockResolvedValue(mockConfig);
                                                      ~~~~~~~~~~

 PASS  src/lib/__tests__/configManager.test.ts
  ● Console

    console.log
      ✓ Configuration saved to /var/folders/1d/k648l6ys2jd7x4_s3ls366yh0000gn/T/memento-config-test-1752485184359/.memento/config.json

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Configuration saved to /var/folders/1d/k648l6ys2jd7x4_s3ls366yh0000gn/T/memento-config-test-1752485184376/.memento/config.json

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Configuration saved to /var/folders/1d/k648l6ys2jd7x4_s3ls366yh0000gn/T/memento-config-test-1752485184385/.memento/config.json

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Configuration saved to /var/folders/1d/k648l6ys2jd7x4_s3ls366yh0000gn/T/memento-config-test-1752485184386/.memento/config.json

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Configuration saved to /var/folders/1d/k648l6ys2jd7x4_s3ls366yh0000gn/T/memento-config-test-1752485184386/.memento/config.json

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Configuration saved to /var/folders/1d/k648l6ys2jd7x4_s3ls366yh0000gn/T/memento-config-test-1752485184387/.memento/config.json

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Configuration saved to /var/folders/1d/k648l6ys2jd7x4_s3ls366yh0000gn/T/memento-config-test-1752485184388/.memento/config.json

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Configuration saved to /var/folders/1d/k648l6ys2jd7x4_s3ls366yh0000gn/T/memento-config-test-1752485184388/.memento/config.json

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Configuration saved to /var/folders/1d/k648l6ys2jd7x4_s3ls366yh0000gn/T/memento-config-test-1752485184388/.memento/config.json

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Configuration saved to /var/folders/1d/k648l6ys2jd7x4_s3ls366yh0000gn/T/memento-config-test-1752485184397/global/.memento/config.json

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Configuration saved to /var/folders/1d/k648l6ys2jd7x4_s3ls366yh0000gn/T/memento-config-test-1752485184397/.memento/config.json

      at Object.success (src/lib/logger.ts:35:13)

 FAIL  src/__tests__/cli.test.ts
  ● CLI › should register all commands

    expect(jest.fn()).toHaveBeenCalled()

    Expected number of calls: >= 1
    Received number of calls:    0

      48 |
      49 |     // Commands are registered when the CLI is imported
    > 50 |     expect(consoleLogSpy).toHaveBeenCalled();
         |                           ^
      51 |     const output = consoleLogSpy.mock.calls.flat().join('\n');
      52 |     expect(output).toContain('init');
      53 |     expect(output).toContain('add');

      at Object.<anonymous> (src/__tests__/cli.test.ts:50:27)

  ● CLI › should show help when no command provided

    expect(jest.fn()).toHaveBeenCalled()

    Expected number of calls: >= 1
    Received number of calls:    0

      63 |     require('../cli');
      64 |
    > 65 |     expect(consoleLogSpy).toHaveBeenCalled();
         |                           ^
      66 |     const output = consoleLogSpy.mock.calls.flat().join('\n');
      67 |     expect(output).toContain('Usage:');
      68 |     expect(output).toContain('A lightweight meta-framework for Claude Code');

      at Object.<anonymous> (src/__tests__/cli.test.ts:65:27)

  ● CLI › should show version

    expect(jest.fn()).toHaveBeenCalled()

    Expected number of calls: >= 1
    Received number of calls:    0

      73 |     require('../cli');
      74 |
    > 75 |     expect(consoleLogSpy).toHaveBeenCalled();
         |                           ^
      76 |     const output = consoleLogSpy.mock.calls.flat().join('\n');
      77 |     expect(output).toContain('0.1.0');
      78 |   });

      at Object.<anonymous> (src/__tests__/cli.test.ts:75:27)

Usage: memento [options] [command]

A lightweight meta-framework for Claude Code

Options:
  -V, --version   output the version number
  -v, --verbose   enable verbose output
  -d, --debug     enable debug output
  -h, --help      display help for command

Commands:
  init            Initialize
  add             Add component
  list            List components
  ticket          Manage tickets
  config          Manage config
  update          Update components
  language        Manage languages
  help [command]  display help for command

Examples:
  $ memento init                    # Initialize Memento Protocol in a project
  $ memento add mode architect      # Add the architect mode
  $ memento add workflow review     # Add the code review workflow
  $ memento ticket create "auth"    # Create a ticket for authentication work
  $ memento list --installed        # Show installed components
  $ memento language                # Auto-detect and install language overrides

For Claude Code users:
  Say "act as architect" to switch to architect mode
  Say "execute review" to run the code review workflow
  Say "create ticket X" to start persistent work

For more information, visit: https://github.com/git-on-my-level/memento-protocol
Documentation: https://github.com/git-on-my-level/memento-protocol#readme
Usage: memento [options] [command]

A lightweight meta-framework for Claude Code

Options:
  -V, --version   output the version number
  -v, --verbose   enable verbose output
  -d, --debug     enable debug output
  -h, --help      display help for command

Commands:
  init            Initialize
  add             Add component
  list            List components
  ticket          Manage tickets
  config          Manage config
  update          Update components
  language        Manage languages
  help [command]  display help for command

Examples:
  $ memento init                    # Initialize Memento Protocol in a project
  $ memento add mode architect      # Add the architect mode
  $ memento add workflow review     # Add the code review workflow
  $ memento ticket create "auth"    # Create a ticket for authentication work
  $ memento list --installed        # Show installed components
  $ memento language                # Auto-detect and install language overrides

For Claude Code users:
  Say "act as architect" to switch to architect mode
  Say "execute review" to run the code review workflow
  Say "create ticket X" to start persistent work

For more information, visit: https://github.com/git-on-my-level/memento-protocol
Documentation: https://github.com/git-on-my-level/memento-protocol#readme
0.1.0
 PASS  src/lib/__tests__/projectDetector.test.ts
 FAIL  src/lib/__tests__/modeHeadingConformity.test.ts
  ● Mode Template Heading Conformity › Mode template: architect.md › should contain all required headings

    expect(received).toContain(expected) // indexOf

    Expected value: "## Mode Switching Triggers"
    Received array: ["## Behavioral Guidelines", "## Core Responsibilities", "## Best Practices", "## Done When"]

      56 |         it('should contain all required headings', () => {
      57 |           for (const required of REQUIRED_HEADINGS) {
    > 58 |             expect(headings).toContain(required);
         |                              ^
      59 |           }
      60 |         });
      61 |

      at Object.<anonymous> (src/lib/__tests__/modeHeadingConformity.test.ts:58:30)

  ● Mode Template Heading Conformity › Mode template: engineer.md › should contain all required headings

    expect(received).toContain(expected) // indexOf

    Expected value: "## Mode Switching Triggers"
    Received array: ["## Behavioral Guidelines", "## Core Responsibilities", "## Best Practices", "## Done When"]

      56 |         it('should contain all required headings', () => {
      57 |           for (const required of REQUIRED_HEADINGS) {
    > 58 |             expect(headings).toContain(required);
         |                              ^
      59 |           }
      60 |         });
      61 |

      at Object.<anonymous> (src/lib/__tests__/modeHeadingConformity.test.ts:58:30)

  ● Mode Template Heading Conformity › Mode template: project-manager.md › should contain all required headings

    expect(received).toContain(expected) // indexOf

    Expected value: "## Mode Switching Triggers"
    Received array: ["## Behavioral Guidelines", "## Core Responsibilities", "## Best Practices", "## Project: User Authentication System", "## Done When"]

      56 |         it('should contain all required headings', () => {
      57 |           for (const required of REQUIRED_HEADINGS) {
    > 58 |             expect(headings).toContain(required);
         |                              ^
      59 |           }
      60 |         });
      61 |

      at Object.<anonymous> (src/lib/__tests__/modeHeadingConformity.test.ts:58:30)

  ● Mode Template Heading Conformity › Mode template: reviewer.md › should contain all required headings

    expect(received).toContain(expected) // indexOf

    Expected value: "## Mode Switching Triggers"
    Received array: ["## Behavioral Guidelines", "## Core Responsibilities", "## Best Practices", "## Done When", "## Review Summary"]

      56 |         it('should contain all required headings', () => {
      57 |           for (const required of REQUIRED_HEADINGS) {
    > 58 |             expect(headings).toContain(required);
         |                              ^
      59 |           }
      60 |         });
      61 |

      at Object.<anonymous> (src/lib/__tests__/modeHeadingConformity.test.ts:58:30)

 PASS  src/lib/__tests__/directoryManager.test.ts
 PASS  src/commands/__tests__/config-basic.test.ts
 FAIL  src/commands/__tests__/ticket-basic.test.ts
  ● Ticket Command Basic Coverage › should handle search command

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "🟢 test-123"
    Received
           1: "
    Found 1 ticket(s) matching \"test\":
    "
           2: "📋 test-123"
           3: "   Name: Test ticket"

    Number of calls: 5

      68 |     expect(mockTicketManager.search).toHaveBeenCalledWith('test');
      69 |     expect(logger.info).toHaveBeenCalledWith('\nFound 1 ticket(s) matching "test":\n');
    > 70 |     expect(logger.info).toHaveBeenCalledWith('🟢 test-123');
         |                         ^
      71 |   });
      72 |
      73 |   it('should handle close command', async () => {

      at Object.<anonymous> (src/commands/__tests__/ticket-basic.test.ts:70:25)

  ● Ticket Command Basic Coverage › should handle resume command with existing ticket

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Workspace: .memento/tickets/test-123/workspace/"
    Received
           1: "
    Ticket: Test"
           2: "Status: closed"
           3: "Workspace: .memento/tickets/closed/test-123/workspace/"

    Number of calls: 5

      106 |     expect(logger.success).toHaveBeenCalledWith('Resumed ticket: test-123');
      107 |     expect(logger.info).toHaveBeenCalledWith('\nTicket: Test');
    > 108 |     expect(logger.info).toHaveBeenCalledWith('Workspace: .memento/tickets/test-123/workspace/');
          |                         ^
      109 |   });
      110 | });

      at Object.<anonymous> (src/commands/__tests__/ticket-basic.test.ts:108:25)

 PASS  src/commands/__tests__/update.test.ts
 FAIL  src/commands/__tests__/ticket.test.ts
  ● Ticket Command › create ticket › should create a new ticket

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Workspace: .memento/tickets/feature-123/workspace/"
    Received
           1: "Ticket created successfully!"
           2: "ID: feature-123"
           3: "Status: next"

    Number of calls: 4

      59 |       expect(logger.info).toHaveBeenCalledWith('Ticket created successfully!');
      60 |       expect(logger.info).toHaveBeenCalledWith('ID: feature-123');
    > 61 |       expect(logger.info).toHaveBeenCalledWith('Workspace: .memento/tickets/feature-123/workspace/');
         |                           ^
      62 |     });
      63 |
      64 |     it('should create ticket with description', async () => {

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:61:27)

  ● Ticket Command › list tickets › should list all active tickets

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "🟢 feature-123"
    Received
           1: "
    Active tickets:
    "
           2: "📋 feature-123"
           3: "   Name: Add feature"

    Number of calls: 14

      102 |       expect(mockTicketManager.list).toHaveBeenCalledWith('active');
      103 |       expect(logger.info).toHaveBeenCalledWith('\nActive tickets:\n');
    > 104 |       expect(logger.info).toHaveBeenCalledWith('🟢 feature-123');
          |                           ^
      105 |       expect(logger.info).toHaveBeenCalledWith('   Name: Add feature');
      106 |       expect(logger.info).toHaveBeenCalledWith('   Description: Add new dashboard');
      107 |     });

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:104:27)

  ● Ticket Command › list tickets › should filter tickets by status

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "⚪ old-123"
    Received
           1: "
    Closed tickets:
    "
           2: "📋 old-123"
           3: "   Name: Old feature"

    Number of calls: 7

      121 |       expect(mockTicketManager.list).toHaveBeenCalledWith('closed');
      122 |       expect(logger.info).toHaveBeenCalledWith('\nClosed tickets:\n');
    > 123 |       expect(logger.info).toHaveBeenCalledWith('⚪ old-123');
          |                           ^
      124 |     });
      125 |
      126 |     it('should handle no tickets', async () => {

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:123:27)

  ● Ticket Command › list tickets › should handle no tickets

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "No active tickets found."
    Received: "No closed tickets found."

    Number of calls: 1

      129 |       await ticketCommand.parseAsync(['node', 'test', 'list']);
      130 |
    > 131 |       expect(logger.info).toHaveBeenCalledWith('No active tickets found.');
          |                           ^
      132 |     });
      133 |   });
      134 |

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:131:27)

  ● Ticket Command › resume ticket › should resume an inactive ticket

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Workspace: .memento/tickets/feature-123/workspace/"
    Received
           1: "
    Ticket: Add feature"
           2: "Status: closed"
           3: "Workspace: .memento/tickets/closed/feature-123/workspace/"

    Number of calls: 5

      148 |       expect(logger.success).toHaveBeenCalledWith('Resumed ticket: feature-123');
      149 |       expect(logger.info).toHaveBeenCalledWith('\nTicket: Add feature');
    > 150 |       expect(logger.info).toHaveBeenCalledWith('Workspace: .memento/tickets/feature-123/workspace/');
          |                           ^
      151 |     });
      152 |
      153 |     it('should handle already active ticket', async () => {

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:150:27)

  ● Ticket Command › resume ticket › should handle already active ticket

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Ticket feature-123 is already active"
    Received
           1: "
    Ticket: Add feature"
           2: "Status: active"
           3: "Workspace: .memento/tickets/active/feature-123/workspace/"

    Number of calls: 5

      161 |       await ticketCommand.parseAsync(['node', 'test', 'resume', 'feature-123']);
      162 |
    > 163 |       expect(logger.info).toHaveBeenCalledWith('Ticket feature-123 is already active');
          |                           ^
      164 |       expect(mockTicketManager.resume).not.toHaveBeenCalled();
      165 |     });
      166 |

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:163:27)

  ● Ticket Command › close ticket › should handle already closed ticket

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Ticket feature-123 is already closed"

    Number of calls: 0

      200 |       await ticketCommand.parseAsync(['node', 'test', 'close', 'feature-123']);
      201 |
    > 202 |       expect(logger.info).toHaveBeenCalledWith('Ticket feature-123 is already closed');
          |                           ^
      203 |       expect(mockTicketManager.close).not.toHaveBeenCalled();
      204 |     });
      205 |   });

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:202:27)

  ● Ticket Command › search tickets › should search tickets by query

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "🟢 feature-123"
    Received
           1: "
    Found 1 ticket(s) matching \"dashboard\":
    "
           2: "📋 feature-123"
           3: "   Name: Add dashboard feature"

    Number of calls: 6

      223 |       expect(mockTicketManager.search).toHaveBeenCalledWith('dashboard');
      224 |       expect(logger.info).toHaveBeenCalledWith('\nFound 1 ticket(s) matching "dashboard":\n');
    > 225 |       expect(logger.info).toHaveBeenCalledWith('🟢 feature-123');
          |                           ^
      226 |       expect(logger.info).toHaveBeenCalledWith('   Name: Add dashboard feature');
      227 |     });
      228 |

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:225:27)

 PASS  src/commands/__tests__/list.test.ts
 FAIL  src/lib/__tests__/updateManager-coverage.test.ts
  ● Test suite failed to run

    src/lib/__tests__/updateManager-coverage.test.ts:2:1 - error TS6133: 'existsSync' is declared but its value is never read.

    2 import { existsSync } from 'fs';
      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

 FAIL  src/lib/__tests__/updateManager-basic.test.ts
  ● UpdateManager Basic › should create instance correctly

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      20 |   beforeEach(() => {
      21 |     jest.clearAllMocks();
    > 22 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      23 |     updateManager = new UpdateManager(mockProjectRoot);
      24 |   });
      25 |

      at Object.<anonymous> (src/lib/__tests__/updateManager-basic.test.ts:22:12)

  ● UpdateManager Basic › should create instance correctly

    TypeError: Cannot delete property 'main' of function () { [native code] }

      25 |
      26 |   afterEach(() => {
    > 27 |     delete (require as any).main;
         |     ^
      28 |   });
      29 |
      30 |   it('should create instance correctly', () => {

      at Object.<anonymous> (src/lib/__tests__/updateManager-basic.test.ts:27:5)

  ● UpdateManager Basic › should handle showDiff errors gracefully

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      20 |   beforeEach(() => {
      21 |     jest.clearAllMocks();
    > 22 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      23 |     updateManager = new UpdateManager(mockProjectRoot);
      24 |   });
      25 |

      at Object.<anonymous> (src/lib/__tests__/updateManager-basic.test.ts:22:12)

  ● UpdateManager Basic › should handle showDiff errors gracefully

    TypeError: Cannot delete property 'main' of function () { [native code] }

      25 |
      26 |   afterEach(() => {
    > 27 |     delete (require as any).main;
         |     ^
      28 |   });
      29 |
      30 |   it('should create instance correctly', () => {

      at Object.<anonymous> (src/lib/__tests__/updateManager-basic.test.ts:27:5)

 PASS  src/lib/__tests__/ticketManager.test.ts
  ● Console

    console.log
      ✓ Created ticket: test-feature-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Created ticket: test-feature-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Created ticket: test-feature-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Created ticket: feature-1-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Created ticket: feature-2-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Created ticket: feature-3-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Updated ticket: feature-3-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Moved ticket feature-3-2025-07-14 from next to done

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Created ticket: feature-1-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Created ticket: feature-2-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Created ticket: feature-3-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Updated ticket: feature-3-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Moved ticket feature-3-2025-07-14 from next to done

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Created ticket: feature-1-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Created ticket: feature-2-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Created ticket: feature-3-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Updated ticket: feature-3-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Moved ticket feature-3-2025-07-14 from next to done

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Created ticket: feature-1-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Created ticket: feature-2-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Created ticket: feature-3-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Updated ticket: feature-3-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Moved ticket feature-3-2025-07-14 from next to done

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Created ticket: test-feature-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Updated ticket: test-feature-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Created ticket: test-feature-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Updated ticket: test-feature-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Moved ticket test-feature-2025-07-14 from next to done

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Created ticket: test-feature-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Updated ticket: test-feature-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Moved ticket test-feature-2025-07-14 from next to done

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Updated ticket: test-feature-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Moved ticket test-feature-2025-07-14 from done to in-progress

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Created ticket: auth-feature-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Created ticket: payment-flow-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Created ticket: user-profile-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Created ticket: auth-feature-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Created ticket: payment-flow-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Created ticket: user-profile-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Created ticket: auth-feature-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Created ticket: payment-flow-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Created ticket: user-profile-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Created ticket: auth-feature-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Created ticket: payment-flow-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Created ticket: user-profile-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Created ticket: test-feature-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ℹ Migrated ticket old-active-2025-01-13 to in-progress

      at Object.info (src/lib/logger.ts:31:13)

    console.log
      ℹ Migrated ticket old-closed-2025-01-13 to done

      at Object.info (src/lib/logger.ts:31:13)

    console.log
      ✓ Migration complete: 2 tickets migrated

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Created ticket: test-feature-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Updated ticket: test-feature-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Moved ticket test-feature-2025-07-14 from next to in-progress

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Updated ticket: test-feature-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Moved ticket test-feature-2025-07-14 from in-progress to done

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Created ticket: test-feature-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ℹ Ticket test-feature-2025-07-14 is already in next

      at Object.info (src/lib/logger.ts:31:13)

 FAIL  src/lib/__tests__/updateManager.test.ts
  ● UpdateManager › checkForUpdates › should return empty array when all components are up to date

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      24 |     jest.clearAllMocks();
      25 |     // Mock require.main before creating the instance
    > 26 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      27 |     updateManager = new UpdateManager(mockProjectRoot);
      28 |   });
      29 |

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:26:12)

  ● UpdateManager › checkForUpdates › should return empty array when all components are up to date

    TypeError: Cannot delete property 'main' of function () { [native code] }

      29 |
      30 |   afterEach(() => {
    > 31 |     delete (require as any).main;
         |     ^
      32 |   });
      33 |
      34 |   describe('checkForUpdates', () => {

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:31:5)

  ● UpdateManager › checkForUpdates › should detect available updates

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      24 |     jest.clearAllMocks();
      25 |     // Mock require.main before creating the instance
    > 26 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      27 |     updateManager = new UpdateManager(mockProjectRoot);
      28 |   });
      29 |

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:26:12)

  ● UpdateManager › checkForUpdates › should detect available updates

    TypeError: Cannot delete property 'main' of function () { [native code] }

      29 |
      30 |   afterEach(() => {
    > 31 |     delete (require as any).main;
         |     ^
      32 |   });
      33 |
      34 |   describe('checkForUpdates', () => {

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:31:5)

  ● UpdateManager › updateComponent › should update a component successfully

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      24 |     jest.clearAllMocks();
      25 |     // Mock require.main before creating the instance
    > 26 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      27 |     updateManager = new UpdateManager(mockProjectRoot);
      28 |   });
      29 |

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:26:12)

  ● UpdateManager › updateComponent › should update a component successfully

    TypeError: Cannot delete property 'main' of function () { [native code] }

      29 |
      30 |   afterEach(() => {
    > 31 |     delete (require as any).main;
         |     ^
      32 |   });
      33 |
      34 |   describe('checkForUpdates', () => {

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:31:5)

  ● UpdateManager › updateComponent › should throw error if component is not installed

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      24 |     jest.clearAllMocks();
      25 |     // Mock require.main before creating the instance
    > 26 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      27 |     updateManager = new UpdateManager(mockProjectRoot);
      28 |   });
      29 |

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:26:12)

  ● UpdateManager › updateComponent › should throw error if component is not installed

    TypeError: Cannot delete property 'main' of function () { [native code] }

      29 |
      30 |   afterEach(() => {
    > 31 |     delete (require as any).main;
         |     ^
      32 |   });
      33 |
      34 |   describe('checkForUpdates', () => {

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:31:5)

  ● UpdateManager › updateComponent › should warn about local changes without force flag

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      24 |     jest.clearAllMocks();
      25 |     // Mock require.main before creating the instance
    > 26 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      27 |     updateManager = new UpdateManager(mockProjectRoot);
      28 |   });
      29 |

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:26:12)

  ● UpdateManager › updateComponent › should warn about local changes without force flag

    TypeError: Cannot delete property 'main' of function () { [native code] }

      29 |
      30 |   afterEach(() => {
    > 31 |     delete (require as any).main;
         |     ^
      32 |   });
      33 |
      34 |   describe('checkForUpdates', () => {

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:31:5)

  ● UpdateManager › updateAll › should update all components with available updates

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      24 |     jest.clearAllMocks();
      25 |     // Mock require.main before creating the instance
    > 26 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      27 |     updateManager = new UpdateManager(mockProjectRoot);
      28 |   });
      29 |

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:26:12)

  ● UpdateManager › updateAll › should update all components with available updates

    TypeError: Cannot delete property 'main' of function () { [native code] }

      29 |
      30 |   afterEach(() => {
    > 31 |     delete (require as any).main;
         |     ^
      32 |   });
      33 |
      34 |   describe('checkForUpdates', () => {

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:31:5)

  ● UpdateManager › updateAll › should log when all components are up to date

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      24 |     jest.clearAllMocks();
      25 |     // Mock require.main before creating the instance
    > 26 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      27 |     updateManager = new UpdateManager(mockProjectRoot);
      28 |   });
      29 |

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:26:12)

  ● UpdateManager › updateAll › should log when all components are up to date

    TypeError: Cannot delete property 'main' of function () { [native code] }

      29 |
      30 |   afterEach(() => {
    > 31 |     delete (require as any).main;
         |     ^
      32 |   });
      33 |
      34 |   describe('checkForUpdates', () => {

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:31:5)

  ● UpdateManager › showDiff › should show diff when component has changes

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      24 |     jest.clearAllMocks();
      25 |     // Mock require.main before creating the instance
    > 26 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      27 |     updateManager = new UpdateManager(mockProjectRoot);
      28 |   });
      29 |

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:26:12)

  ● UpdateManager › showDiff › should show diff when component has changes

    TypeError: Cannot delete property 'main' of function () { [native code] }

      29 |
      30 |   afterEach(() => {
    > 31 |     delete (require as any).main;
         |     ^
      32 |   });
      33 |
      34 |   describe('checkForUpdates', () => {

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:31:5)

  ● UpdateManager › showDiff › should indicate when component is up to date

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      24 |     jest.clearAllMocks();
      25 |     // Mock require.main before creating the instance
    > 26 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      27 |     updateManager = new UpdateManager(mockProjectRoot);
      28 |   });
      29 |

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:26:12)

  ● UpdateManager › showDiff › should indicate when component is up to date

    TypeError: Cannot delete property 'main' of function () { [native code] }

      29 |
      30 |   afterEach(() => {
    > 31 |     delete (require as any).main;
         |     ^
      32 |   });
      33 |
      34 |   describe('checkForUpdates', () => {

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:31:5)

 PASS  src/lib/__tests__/interactiveSetup-basic.test.ts
 FAIL  src/lib/__tests__/languageOverrideManager-basic.test.ts
  ● LanguageOverrideManager Basic › should create instance correctly

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      20 |   beforeEach(() => {
      21 |     jest.clearAllMocks();
    > 22 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      23 |     
      24 |     (DirectoryManager as jest.MockedClass<typeof DirectoryManager>).mockImplementation(() => ({
      25 |       getComponentPath: jest.fn()

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager-basic.test.ts:22:12)

 FAIL  src/lib/__tests__/languageOverrideManager-coverage.test.ts
  ● Test suite failed to run

    src/lib/__tests__/languageOverrideManager-coverage.test.ts:2:1 - error TS6133: 'existsSync' is declared but its value is never read.

    2 import { existsSync } from 'fs';
      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    src/lib/__tests__/languageOverrideManager-coverage.test.ts:5:1 - error TS6133: 'logger' is declared but its value is never read.

    5 import { logger } from '../logger';
      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

 FAIL  src/lib/__tests__/languageOverrideManager.test.ts
  ● LanguageOverrideManager › detectProjectLanguage › should detect TypeScript project

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      23 |     jest.clearAllMocks();
      24 |     // Mock require.main before creating the instance
    > 25 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      26 |     languageManager = new LanguageOverrideManager(mockProjectRoot);
      27 |   });
      28 |

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager.test.ts:25:12)

  ● LanguageOverrideManager › detectProjectLanguage › should detect Python project

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      23 |     jest.clearAllMocks();
      24 |     // Mock require.main before creating the instance
    > 25 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      26 |     languageManager = new LanguageOverrideManager(mockProjectRoot);
      27 |   });
      28 |

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager.test.ts:25:12)

  ● LanguageOverrideManager › detectProjectLanguage › should detect JavaScript project from package.json

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      23 |     jest.clearAllMocks();
      24 |     // Mock require.main before creating the instance
    > 25 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      26 |     languageManager = new LanguageOverrideManager(mockProjectRoot);
      27 |   });
      28 |

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager.test.ts:25:12)

  ● LanguageOverrideManager › detectProjectLanguage › should detect TypeScript from package.json dependencies

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      23 |     jest.clearAllMocks();
      24 |     // Mock require.main before creating the instance
    > 25 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      26 |     languageManager = new LanguageOverrideManager(mockProjectRoot);
      27 |   });
      28 |

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager.test.ts:25:12)

  ● LanguageOverrideManager › detectProjectLanguage › should return null when no language is detected

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      23 |     jest.clearAllMocks();
      24 |     // Mock require.main before creating the instance
    > 25 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      26 |     languageManager = new LanguageOverrideManager(mockProjectRoot);
      27 |   });
      28 |

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager.test.ts:25:12)

  ● LanguageOverrideManager › detectProjectLanguage › should handle glob patterns for language detection

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      23 |     jest.clearAllMocks();
      24 |     // Mock require.main before creating the instance
    > 25 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      26 |     languageManager = new LanguageOverrideManager(mockProjectRoot);
      27 |   });
      28 |

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager.test.ts:25:12)

  ● LanguageOverrideManager › loadLanguageOverride › should load and cache language override

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      23 |     jest.clearAllMocks();
      24 |     // Mock require.main before creating the instance
    > 25 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      26 |     languageManager = new LanguageOverrideManager(mockProjectRoot);
      27 |   });
      28 |

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager.test.ts:25:12)

  ● LanguageOverrideManager › loadLanguageOverride › should return null for non-existent override

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      23 |     jest.clearAllMocks();
      24 |     // Mock require.main before creating the instance
    > 25 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      26 |     languageManager = new LanguageOverrideManager(mockProjectRoot);
      27 |   });
      28 |

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager.test.ts:25:12)

  ● LanguageOverrideManager › applyWorkflowOverrides › should apply language-specific overrides to workflow

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      23 |     jest.clearAllMocks();
      24 |     // Mock require.main before creating the instance
    > 25 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      26 |     languageManager = new LanguageOverrideManager(mockProjectRoot);
      27 |   });
      28 |

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager.test.ts:25:12)

  ● LanguageOverrideManager › applyWorkflowOverrides › should return original content when no language detected

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      23 |     jest.clearAllMocks();
      24 |     // Mock require.main before creating the instance
    > 25 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      26 |     languageManager = new LanguageOverrideManager(mockProjectRoot);
      27 |   });
      28 |

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager.test.ts:25:12)

  ● LanguageOverrideManager › applyWorkflowOverrides › should return original content when no override exists

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      23 |     jest.clearAllMocks();
      24 |     // Mock require.main before creating the instance
    > 25 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      26 |     languageManager = new LanguageOverrideManager(mockProjectRoot);
      27 |   });
      28 |

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager.test.ts:25:12)

  ● LanguageOverrideManager › applyModeOverrides › should apply language-specific overrides to mode

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      23 |     jest.clearAllMocks();
      24 |     // Mock require.main before creating the instance
    > 25 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      26 |     languageManager = new LanguageOverrideManager(mockProjectRoot);
      27 |   });
      28 |

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager.test.ts:25:12)

  ● LanguageOverrideManager › installLanguageOverride › should install language override successfully

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      23 |     jest.clearAllMocks();
      24 |     // Mock require.main before creating the instance
    > 25 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      26 |     languageManager = new LanguageOverrideManager(mockProjectRoot);
      27 |   });
      28 |

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager.test.ts:25:12)

  ● LanguageOverrideManager › installLanguageOverride › should throw error for non-existent language

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      23 |     jest.clearAllMocks();
      24 |     // Mock require.main before creating the instance
    > 25 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      26 |     languageManager = new LanguageOverrideManager(mockProjectRoot);
      27 |   });
      28 |

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager.test.ts:25:12)

  ● LanguageOverrideManager › autoInstallLanguageOverride › should auto-detect and install appropriate override

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      23 |     jest.clearAllMocks();
      24 |     // Mock require.main before creating the instance
    > 25 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      26 |     languageManager = new LanguageOverrideManager(mockProjectRoot);
      27 |   });
      28 |

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager.test.ts:25:12)

  ● LanguageOverrideManager › autoInstallLanguageOverride › should return null when no language detected

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      23 |     jest.clearAllMocks();
      24 |     // Mock require.main before creating the instance
    > 25 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      26 |     languageManager = new LanguageOverrideManager(mockProjectRoot);
      27 |   });
      28 |

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager.test.ts:25:12)

  ● LanguageOverrideManager › autoInstallLanguageOverride › should warn when no override available for detected language

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      23 |     jest.clearAllMocks();
      24 |     // Mock require.main before creating the instance
    > 25 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      26 |     languageManager = new LanguageOverrideManager(mockProjectRoot);
      27 |   });
      28 |

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager.test.ts:25:12)

 FAIL  src/commands/__tests__/language-basic.test.ts
  ● Test suite failed to run

    Jest encountered an unexpected token

    Jest failed to parse a file. This happens e.g. when your code or its dependencies use non-standard JavaScript syntax, or when Jest is not configured to support such syntax.

    Out of the box Jest supports Babel, which will be used to transform your files into valid JS based on your Babel configuration.

    By default "node_modules" folder is ignored by transformers.

    Here's what you can do:
     • If you are trying to use ECMAScript Modules, see https://jestjs.io/docs/ecmascript-modules for how to enable it.
     • If you are trying to use TypeScript, see https://jestjs.io/docs/getting-started#using-typescript
     • To have some of your "node_modules" files transformed, you can specify a custom "transformIgnorePatterns" in your config.
     • If you need a custom transformation specify a "transform" option in your config.
     • If you simply want to mock your non-JS modules (e.g. binary assets) you can stub them out with the "moduleNameMapper" config option.

    You'll find more details and examples of these config options in the docs:
    https://jestjs.io/docs/configuration
    For information about custom transformations, see:
    https://jestjs.io/docs/code-transformation

    Details:

    /Users/dazheng/workspace/personal/memento-protocol/node_modules/inquirer/lib/index.js:6
    import { default as List } from './prompts/list.js';
    ^^^^^^

    SyntaxError: Cannot use import statement outside a module

      3 | import { DirectoryManager } from '../lib/directoryManager';
      4 | import { logger } from '../lib/logger';
    > 5 | import inquirer from 'inquirer';
        | ^
      6 |
      7 | export function createLanguageCommand(): Command {
      8 |   const cmd = new Command('language');

      at Runtime.createScriptFromCode (node_modules/jest-runtime/build/index.js:1505:14)
      at Object.<anonymous> (src/commands/language.ts:5:1)
      at Object.<anonymous> (src/commands/__tests__/language-basic.test.ts:1:1)

 FAIL  src/lib/__tests__/interactiveSetup.test.ts
  ● Test suite failed to run

    src/lib/__tests__/interactiveSetup.test.ts:99:49 - error TS2345: Argument of type '{ type: "fullstack"; framework: string; languages: string[]; suggestedModes: string[]; suggestedWorkflows: string[]; files: never[]; dependencies: {}; }' is not assignable to parameter of type 'ProjectInfo'.
      Types of property 'framework' are incompatible.
        Type 'string' is not assignable to type '"react" | "express" | "gin" | "vanilla" | "vue" | "angular" | "nextjs" | "nuxt" | undefined'.

    99       const result = await interactiveSetup.run(mockProjectInfo);
                                                       ~~~~~~~~~~~~~~~
    src/lib/__tests__/interactiveSetup.test.ts:131:34 - error TS2345: Argument of type '{ type: "fullstack"; framework: string; languages: string[]; suggestedModes: string[]; suggestedWorkflows: string[]; files: never[]; dependencies: {}; }' is not assignable to parameter of type 'ProjectInfo'.
      Types of property 'framework' are incompatible.
        Type 'string' is not assignable to type '"react" | "express" | "gin" | "vanilla" | "vue" | "angular" | "nextjs" | "nuxt" | undefined'.

    131       await interactiveSetup.run(mockProjectInfo);
                                         ~~~~~~~~~~~~~~~
    src/lib/__tests__/interactiveSetup.test.ts:154:41 - error TS2345: Argument of type '{ type: "fullstack"; framework: string; languages: string[]; suggestedModes: string[]; suggestedWorkflows: string[]; files: never[]; dependencies: {}; }' is not assignable to parameter of type 'ProjectInfo'.
      Types of property 'framework' are incompatible.
        Type 'string' is not assignable to type '"react" | "express" | "gin" | "vanilla" | "vue" | "angular" | "nextjs" | "nuxt" | undefined'.

    154       await expect(interactiveSetup.run(mockProjectInfo))
                                                ~~~~~~~~~~~~~~~

 FAIL  src/lib/__tests__/componentInstaller-basic.test.ts
  ● ComponentInstaller Basic › should create instance correctly

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      20 |   beforeEach(() => {
      21 |     jest.clearAllMocks();
    > 22 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      23 |     
      24 |     (DirectoryManager as jest.MockedClass<typeof DirectoryManager>).mockImplementation(() => ({
      25 |       getManifest: jest.fn().mockResolvedValue({ components: { modes: [], workflows: [] } }),

      at Object.<anonymous> (src/lib/__tests__/componentInstaller-basic.test.ts:22:12)

 FAIL  src/lib/__tests__/componentInstaller-coverage.test.ts
  ● Test suite failed to run

    src/lib/__tests__/componentInstaller-coverage.test.ts:1:1 - error TS6133: 'fs' is declared but its value is never read.

    1 import * as fs from 'fs/promises';
      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    src/lib/__tests__/componentInstaller-coverage.test.ts:5:1 - error TS6133: 'logger' is declared but its value is never read.

    5 import { logger } from '../logger';
      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

 PASS  src/lib/__tests__/claudeMdGenerator.test.ts
 PASS  src/lib/__tests__/componentInstaller.test.ts
 PASS  src/commands/__tests__/language.test.ts
 FAIL  src/commands/__tests__/init-basic.test.ts
  ● Init Command Basic › should successfully run basic init

    expect(jest.fn()).toHaveBeenCalled()

    Expected number of calls: >= 1
    Received number of calls:    0

      81 |
      82 |     expect(mockDirManager.initializeStructure).toHaveBeenCalled();
    > 83 |     expect(mockClaudeMdGen.generate).toHaveBeenCalled();
         |                                      ^
      84 |     expect(logger.success).toHaveBeenCalledWith('Memento Protocol initialized successfully!');
      85 |   });
      86 | });

      at Object.<anonymous> (src/commands/__tests__/init-basic.test.ts:83:38)

 FAIL  src/commands/__tests__/init.test.ts
  ● Init Command › successful initialization › should initialize with quick setup

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Memento Protocol initialized successfully!"
    Received: "
    Memento Protocol initialized successfully!"

    Number of calls: 1

       95 |       expect(mockInteractiveSetup.applySetup).toHaveBeenCalled();
       96 |       expect(mockClaudeMdGen.generate).toHaveBeenCalled();
    >  97 |       expect(logger.success).toHaveBeenCalledWith('Memento Protocol initialized successfully!');
          |                              ^
       98 |     });
       99 |
      100 |     it('should initialize with interactive setup', async () => {

      at Object.<anonymous> (src/commands/__tests__/init.test.ts:97:30)

  ● Init Command › successful initialization › should initialize with interactive setup

    expect(jest.fn()).toHaveBeenCalled()

    Expected number of calls: >= 1
    Received number of calls:    0

      118 |       await initCommand.parseAsync(['node', 'test']);
      119 |
    > 120 |       expect(mockInteractiveSetup.run).toHaveBeenCalled();
          |                                        ^
      121 |       expect(mockInteractiveSetup.applySetup).toHaveBeenCalled();
      122 |     });
      123 |

      at Object.<anonymous> (src/commands/__tests__/init.test.ts:120:40)

  ● Init Command › error handling › should error when already initialized without force flag

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Memento Protocol is already initialized. Use --force to reinitialize."

    Number of calls: 0

      155 |       await initCommand.parseAsync(['node', 'test']);
      156 |
    > 157 |       expect(logger.error).toHaveBeenCalledWith(
          |                            ^
      158 |         'Memento Protocol is already initialized. Use --force to reinitialize.'
      159 |       );
      160 |       expect(process.exit).toHaveBeenCalledWith(1);

      at Object.<anonymous> (src/commands/__tests__/init.test.ts:157:28)

  ● Init Command › error handling › should reinitialize with force flag

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Force reinitializing Memento Protocol..."

    Number of calls: 0

      181 |       await initCommand.parseAsync(['node', 'test', '--force', '--quick']);
      182 |
    > 183 |       expect(logger.warn).toHaveBeenCalledWith('Force reinitializing Memento Protocol...');
          |                           ^
      184 |       expect(mockDirManager.initializeStructure).toHaveBeenCalled();
      185 |     });
      186 |

      at Object.<anonymous> (src/commands/__tests__/init.test.ts:183:27)

  ● Init Command › error handling › should handle initialization errors

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Failed to initialize: Permission denied"
    Received: "Failed to initialize Memento Protocol:", [Error: Permission denied]

    Number of calls: 1

      191 |       await initCommand.parseAsync(['node', 'test', '--quick']);
      192 |
    > 193 |       expect(logger.error).toHaveBeenCalledWith('Failed to initialize: Permission denied');
          |                            ^
      194 |       expect(process.exit).toHaveBeenCalledWith(1);
      195 |     });
      196 |

      at Object.<anonymous> (src/commands/__tests__/init.test.ts:193:28)

  ● Init Command › error handling › should handle setup cancellation

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Failed to initialize: Setup cancelled by user"
    Received: "Failed to initialize Memento Protocol:", [TypeError: Cannot read properties of undefined (reading 'selectedModes')]

    Number of calls: 1

      210 |       await initCommand.parseAsync(['node', 'test']);
      211 |
    > 212 |       expect(logger.error).toHaveBeenCalledWith('Failed to initialize: Setup cancelled by user');
          |                            ^
      213 |       expect(process.exit).toHaveBeenCalledWith(1);
      214 |     });
      215 |   });

      at Object.<anonymous> (src/commands/__tests__/init.test.ts:212:28)

Summary of all failing tests
 FAIL  src/lib/__tests__/logger-complete.test.ts
  ● logger complete coverage › should test all logger methods

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Info message"
    Received: "ℹ Info message"

    Number of calls: 1

      18 |     // Test info
      19 |     logger.info('Info message');
    > 20 |     expect(consoleLogSpy).toHaveBeenCalledWith('\x1b[36mInfo message\x1b[0m');
         |                           ^
      21 |
      22 |     // Test success
      23 |     logger.success('Success message');

      at Object.<anonymous> (src/lib/__tests__/logger-complete.test.ts:20:27)

 FAIL  src/lib/__tests__/logger.test.ts
  ● logger › info › should log info messages with cyan color

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Test info message"
    Received: "ℹ Test info message"

    Number of calls: 1

      19 |       logger.info('Test info message');
      20 |       
    > 21 |       expect(consoleLogSpy).toHaveBeenCalledWith('\x1b[36mTest info message\x1b[0m');
         |                             ^
      22 |     });
      23 |   });
      24 |

      at Object.<anonymous> (src/lib/__tests__/logger.test.ts:21:29)

  ● logger › success › should log success messages with green checkmark

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "✓ Operation successful"
    Received: "✓ Operation successful"

    Number of calls: 1

      27 |       logger.success('Operation successful');
      28 |       
    > 29 |       expect(consoleLogSpy).toHaveBeenCalledWith('\x1b[32m✓ Operation successful\x1b[0m');
         |                             ^
      30 |     });
      31 |   });
      32 |

      at Object.<anonymous> (src/lib/__tests__/logger.test.ts:29:29)

  ● logger › warn › should log warning messages with yellow color

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "⚠ Warning message"

    Number of calls: 0

      35 |       logger.warn('Warning message');
      36 |       
    > 37 |       expect(consoleLogSpy).toHaveBeenCalledWith('\x1b[33m⚠ Warning message\x1b[0m');
         |                             ^
      38 |     });
      39 |   });
      40 |

      at Object.<anonymous> (src/lib/__tests__/logger.test.ts:37:29)

  ● logger › error › should log error messages with red cross

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "✗ Error occurred"
    Received: "✖ Error occurred"

    Number of calls: 1

      43 |       logger.error('Error occurred');
      44 |       
    > 45 |       expect(consoleErrorSpy).toHaveBeenCalledWith('\x1b[31m✗ Error occurred\x1b[0m');
         |                               ^
      46 |     });
      47 |   });
      48 |

      at Object.<anonymous> (src/lib/__tests__/logger.test.ts:45:31)

  ● logger › color support › should handle different message types

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Simple message"
    Received: "ℹ Simple message"

    Number of calls: 1

      59 |       messages.forEach(msg => {
      60 |         logger.info(msg);
    > 61 |         expect(consoleLogSpy).toHaveBeenCalledWith(`\x1b[36m${msg}\x1b[0m`);
         |                               ^
      62 |       });
      63 |     });
      64 |   });

      at src/lib/__tests__/logger.test.ts:61:31
          at Array.forEach (<anonymous>)
      at Object.<anonymous> (src/lib/__tests__/logger.test.ts:59:16)

 FAIL  src/commands/__tests__/add.test.ts
  ● Add Command › add mode › should handle installation errors

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Failed to add component: Component not found"
    Received: "Failed to add component:", [Error: Component not found]

    Number of calls: 1

      60 |       await addCommand.parseAsync(['node', 'test', 'mode', 'invalid']);
      61 |
    > 62 |       expect(logger.error).toHaveBeenCalledWith('Failed to add component: Component not found');
         |                            ^
      63 |       expect(process.exit).toHaveBeenCalledWith(1);
      64 |     });
      65 |   });

      at Object.<anonymous> (src/commands/__tests__/add.test.ts:62:28)

  ● Add Command › validation › should error when not initialized

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Memento Protocol is not initialized. Run \"memento init\" first."
    Received: "Memento Protocol is not initialized in this project."

    Number of calls: 1

      85 |       await addCommand.parseAsync(['node', 'test', 'mode', 'architect']);
      86 |
    > 87 |       expect(logger.error).toHaveBeenCalledWith('Memento Protocol is not initialized. Run "memento init" first.');
         |                            ^
      88 |       expect(process.exit).toHaveBeenCalledWith(1);
      89 |     });
      90 |

      at Object.<anonymous> (src/commands/__tests__/add.test.ts:87:28)

 FAIL  src/commands/__tests__/config.test.ts
  ● Test suite failed to run

    src/commands/__tests__/config.test.ts:75:48 - error TS2345: Argument of type '{ theme: string; }' is not assignable to parameter of type 'MementoConfig | Promise<MementoConfig>'.

    75       mockConfigManager.list.mockResolvedValue(mockConfig);
                                                      ~~~~~~~~~~

 FAIL  src/__tests__/cli.test.ts
  ● CLI › should register all commands

    expect(jest.fn()).toHaveBeenCalled()

    Expected number of calls: >= 1
    Received number of calls:    0

      48 |
      49 |     // Commands are registered when the CLI is imported
    > 50 |     expect(consoleLogSpy).toHaveBeenCalled();
         |                           ^
      51 |     const output = consoleLogSpy.mock.calls.flat().join('\n');
      52 |     expect(output).toContain('init');
      53 |     expect(output).toContain('add');

      at Object.<anonymous> (src/__tests__/cli.test.ts:50:27)

  ● CLI › should show help when no command provided

    expect(jest.fn()).toHaveBeenCalled()

    Expected number of calls: >= 1
    Received number of calls:    0

      63 |     require('../cli');
      64 |
    > 65 |     expect(consoleLogSpy).toHaveBeenCalled();
         |                           ^
      66 |     const output = consoleLogSpy.mock.calls.flat().join('\n');
      67 |     expect(output).toContain('Usage:');
      68 |     expect(output).toContain('A lightweight meta-framework for Claude Code');

      at Object.<anonymous> (src/__tests__/cli.test.ts:65:27)

  ● CLI › should show version

    expect(jest.fn()).toHaveBeenCalled()

    Expected number of calls: >= 1
    Received number of calls:    0

      73 |     require('../cli');
      74 |
    > 75 |     expect(consoleLogSpy).toHaveBeenCalled();
         |                           ^
      76 |     const output = consoleLogSpy.mock.calls.flat().join('\n');
      77 |     expect(output).toContain('0.1.0');
      78 |   });

      at Object.<anonymous> (src/__tests__/cli.test.ts:75:27)

 FAIL  src/lib/__tests__/modeHeadingConformity.test.ts
  ● Mode Template Heading Conformity › Mode template: architect.md › should contain all required headings

    expect(received).toContain(expected) // indexOf

    Expected value: "## Mode Switching Triggers"
    Received array: ["## Behavioral Guidelines", "## Core Responsibilities", "## Best Practices", "## Done When"]

      56 |         it('should contain all required headings', () => {
      57 |           for (const required of REQUIRED_HEADINGS) {
    > 58 |             expect(headings).toContain(required);
         |                              ^
      59 |           }
      60 |         });
      61 |

      at Object.<anonymous> (src/lib/__tests__/modeHeadingConformity.test.ts:58:30)

  ● Mode Template Heading Conformity › Mode template: engineer.md › should contain all required headings

    expect(received).toContain(expected) // indexOf

    Expected value: "## Mode Switching Triggers"
    Received array: ["## Behavioral Guidelines", "## Core Responsibilities", "## Best Practices", "## Done When"]

      56 |         it('should contain all required headings', () => {
      57 |           for (const required of REQUIRED_HEADINGS) {
    > 58 |             expect(headings).toContain(required);
         |                              ^
      59 |           }
      60 |         });
      61 |

      at Object.<anonymous> (src/lib/__tests__/modeHeadingConformity.test.ts:58:30)

  ● Mode Template Heading Conformity › Mode template: project-manager.md › should contain all required headings

    expect(received).toContain(expected) // indexOf

    Expected value: "## Mode Switching Triggers"
    Received array: ["## Behavioral Guidelines", "## Core Responsibilities", "## Best Practices", "## Project: User Authentication System", "## Done When"]

      56 |         it('should contain all required headings', () => {
      57 |           for (const required of REQUIRED_HEADINGS) {
    > 58 |             expect(headings).toContain(required);
         |                              ^
      59 |           }
      60 |         });
      61 |

      at Object.<anonymous> (src/lib/__tests__/modeHeadingConformity.test.ts:58:30)

  ● Mode Template Heading Conformity › Mode template: reviewer.md › should contain all required headings

    expect(received).toContain(expected) // indexOf

    Expected value: "## Mode Switching Triggers"
    Received array: ["## Behavioral Guidelines", "## Core Responsibilities", "## Best Practices", "## Done When", "## Review Summary"]

      56 |         it('should contain all required headings', () => {
      57 |           for (const required of REQUIRED_HEADINGS) {
    > 58 |             expect(headings).toContain(required);
         |                              ^
      59 |           }
      60 |         });
      61 |

      at Object.<anonymous> (src/lib/__tests__/modeHeadingConformity.test.ts:58:30)

 FAIL  src/commands/__tests__/ticket-basic.test.ts
  ● Ticket Command Basic Coverage › should handle search command

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "�� test-123"
    Received
           1: "
    Found 1 ticket(s) matching \"test\":
    "
           2: "�� test-123"
           3: "   Name: Test ticket"

    Number of calls: 5

      68 |     expect(mockTicketManager.search).toHaveBeenCalledWith('test');
      69 |     expect(logger.info).toHaveBeenCalledWith('\nFound 1 ticket(s) matching "test":\n');
    > 70 |     expect(logger.info).toHaveBeenCalledWith('�� test-123');
         |                         ^
      71 |   });
      72 |
      73 |   it('should handle close command', async () => {

      at Object.<anonymous> (src/commands/__tests__/ticket-basic.test.ts:70:25)

  ● Ticket Command Basic Coverage › should handle resume command with existing ticket

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Workspace: .memento/tickets/test-123/workspace/"
    Received
           1: "
    Ticket: Test"
           2: "Status: closed"
           3: "Workspace: .memento/tickets/closed/test-123/workspace/"

    Number of calls: 5

      106 |     expect(logger.success).toHaveBeenCalledWith('Resumed ticket: test-123');
      107 |     expect(logger.info).toHaveBeenCalledWith('\nTicket: Test');
    > 108 |     expect(logger.info).toHaveBeenCalledWith('Workspace: .memento/tickets/test-123/workspace/');
          |                         ^
      109 |   });
      110 | });

      at Object.<anonymous> (src/commands/__tests__/ticket-basic.test.ts:108:25)

 FAIL  src/commands/__tests__/ticket.test.ts
  ● Ticket Command › create ticket › should create a new ticket

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Workspace: .memento/tickets/feature-123/workspace/"
    Received
           1: "Ticket created successfully!"
           2: "ID: feature-123"
           3: "Status: next"

    Number of calls: 4

      59 |       expect(logger.info).toHaveBeenCalledWith('Ticket created successfully!');
      60 |       expect(logger.info).toHaveBeenCalledWith('ID: feature-123');
    > 61 |       expect(logger.info).toHaveBeenCalledWith('Workspace: .memento/tickets/feature-123/workspace/');
         |                           ^
      62 |     });
      63 |
      64 |     it('should create ticket with description', async () => {

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:61:27)

  ● Ticket Command › list tickets › should list all active tickets

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "�� feature-123"
    Received
           1: "
    Active tickets:
    "
           2: "�� feature-123"
           3: "   Name: Add feature"

    Number of calls: 14

      102 |       expect(mockTicketManager.list).toHaveBeenCalledWith('active');
      103 |       expect(logger.info).toHaveBeenCalledWith('\nActive tickets:\n');
    > 104 |       expect(logger.info).toHaveBeenCalledWith('�� feature-123');
          |                           ^
      105 |       expect(logger.info).toHaveBeenCalledWith('   Name: Add feature');
      106 |       expect(logger.info).toHaveBeenCalledWith('   Description: Add new dashboard');
      107 |     });

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:104:27)

  ● Ticket Command › list tickets › should filter tickets by status

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "⚪ old-123"
    Received
           1: "
    Closed tickets:
    "
           2: "�� old-123"
           3: "   Name: Old feature"

    Number of calls: 7

      121 |       expect(mockTicketManager.list).toHaveBeenCalledWith('closed');
      122 |       expect(logger.info).toHaveBeenCalledWith('\nClosed tickets:\n');
    > 123 |       expect(logger.info).toHaveBeenCalledWith('⚪ old-123');
          |                           ^
      124 |     });
      125 |
      126 |     it('should handle no tickets', async () => {

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:123:27)

  ● Ticket Command › list tickets › should handle no tickets

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "No active tickets found."
    Received: "No closed tickets found."

    Number of calls: 1

      129 |       await ticketCommand.parseAsync(['node', 'test', 'list']);
      130 |
    > 131 |       expect(logger.info).toHaveBeenCalledWith('No active tickets found.');
          |                           ^
      132 |     });
      133 |   });
      134 |

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:131:27)

  ● Ticket Command › resume ticket › should resume an inactive ticket

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Workspace: .memento/tickets/feature-123/workspace/"
    Received
           1: "
    Ticket: Add feature"
           2: "Status: closed"
           3: "Workspace: .memento/tickets/closed/feature-123/workspace/"

    Number of calls: 5

      148 |       expect(logger.success).toHaveBeenCalledWith('Resumed ticket: feature-123');
      149 |       expect(logger.info).toHaveBeenCalledWith('\nTicket: Add feature');
    > 150 |       expect(logger.info).toHaveBeenCalledWith('Workspace: .memento/tickets/feature-123/workspace/');
          |                           ^
      151 |     });
      152 |
      153 |     it('should handle already active ticket', async () => {

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:150:27)

  ● Ticket Command › resume ticket › should handle already active ticket

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Ticket feature-123 is already active"
    Received
           1: "
    Ticket: Add feature"
           2: "Status: active"
           3: "Workspace: .memento/tickets/active/feature-123/workspace/"

    Number of calls: 5

      161 |       await ticketCommand.parseAsync(['node', 'test', 'resume', 'feature-123']);
      162 |
    > 163 |       expect(logger.info).toHaveBeenCalledWith('Ticket feature-123 is already active');
          |                           ^
      164 |       expect(mockTicketManager.resume).not.toHaveBeenCalled();
      165 |     });
      166 |

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:163:27)

  ● Ticket Command › close ticket › should handle already closed ticket

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Ticket feature-123 is already closed"

    Number of calls: 0

      200 |       await ticketCommand.parseAsync(['node', 'test', 'close', 'feature-123']);
      201 |
    > 202 |       expect(logger.info).toHaveBeenCalledWith('Ticket feature-123 is already closed');
          |                           ^
      203 |       expect(mockTicketManager.close).not.toHaveBeenCalled();
      204 |     });
      205 |   });

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:202:27)

  ● Ticket Command › search tickets › should search tickets by query

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "�� feature-123"
    Received
           1: "
    Found 1 ticket(s) matching \"dashboard\":
    "
           2: "�� feature-123"
           3: "   Name: Add dashboard feature"

    Number of calls: 6

      223 |       expect(mockTicketManager.search).toHaveBeenCalledWith('dashboard');
      224 |       expect(logger.info).toHaveBeenCalledWith('\nFound 1 ticket(s) matching "dashboard":\n');
    > 225 |       expect(logger.info).toHaveBeenCalledWith('�� feature-123');
          |                           ^
      226 |       expect(logger.info).toHaveBeenCalledWith('   Name: Add dashboard feature');
      227 |     });
      228 |

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:225:27)

 FAIL  src/lib/__tests__/updateManager-coverage.test.ts
  ● Test suite failed to run

    src/lib/__tests__/updateManager-coverage.test.ts:2:1 - error TS6133: 'existsSync' is declared but its value is never read.

    2 import { existsSync } from 'fs';
      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

 FAIL  src/lib/__tests__/updateManager-basic.test.ts
  ● UpdateManager Basic › should create instance correctly

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      20 |   beforeEach(() => {
      21 |     jest.clearAllMocks();
    > 22 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      23 |     updateManager = new UpdateManager(mockProjectRoot);
      24 |   });
      25 |

      at Object.<anonymous> (src/lib/__tests__/updateManager-basic.test.ts:22:12)

  ● UpdateManager Basic › should create instance correctly

    TypeError: Cannot delete property 'main' of function () { [native code] }

      25 |
      26 |   afterEach(() => {
    > 27 |     delete (require as any).main;
         |     ^
      28 |   });
      29 |
      30 |   it('should create instance correctly', () => {

      at Object.<anonymous> (src/lib/__tests__/updateManager-basic.test.ts:27:5)

  ● UpdateManager Basic › should handle showDiff errors gracefully

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      20 |   beforeEach(() => {
      21 |     jest.clearAllMocks();
    > 22 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      23 |     updateManager = new UpdateManager(mockProjectRoot);
      24 |   });
      25 |

      at Object.<anonymous> (src/lib/__tests__/updateManager-basic.test.ts:22:12)

  ● UpdateManager Basic › should handle showDiff errors gracefully

    TypeError: Cannot delete property 'main' of function () { [native code] }

      25 |
      26 |   afterEach(() => {
    > 27 |     delete (require as any).main;
         |     ^
      28 |   });
      29 |
      30 |   it('should create instance correctly', () => {

      at Object.<anonymous> (src/lib/__tests__/updateManager-basic.test.ts:27:5)

 FAIL  src/lib/__tests__/updateManager.test.ts
  ● UpdateManager › checkForUpdates › should return empty array when all components are up to date

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      24 |     jest.clearAllMocks();
      25 |     // Mock require.main before creating the instance
    > 26 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      27 |     updateManager = new UpdateManager(mockProjectRoot);
      28 |   });
      29 |

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:26:12)

  ● UpdateManager › checkForUpdates › should return empty array when all components are up to date

    TypeError: Cannot delete property 'main' of function () { [native code] }

      29 |
      30 |   afterEach(() => {
    > 31 |     delete (require as any).main;
         |     ^
      32 |   });
      33 |
      34 |   describe('checkForUpdates', () => {

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:31:5)

  ● UpdateManager › checkForUpdates › should detect available updates

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      24 |     jest.clearAllMocks();
      25 |     // Mock require.main before creating the instance
    > 26 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      27 |     updateManager = new UpdateManager(mockProjectRoot);
      28 |   });
      29 |

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:26:12)

  ● UpdateManager › checkForUpdates › should detect available updates

    TypeError: Cannot delete property 'main' of function () { [native code] }

      29 |
      30 |   afterEach(() => {
    > 31 |     delete (require as any).main;
         |     ^
      32 |   });
      33 |
      34 |   describe('checkForUpdates', () => {

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:31:5)

  ● UpdateManager › updateComponent › should update a component successfully

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      24 |     jest.clearAllMocks();
      25 |     // Mock require.main before creating the instance
    > 26 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      27 |     updateManager = new UpdateManager(mockProjectRoot);
      28 |   });
      29 |

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:26:12)

  ● UpdateManager › updateComponent › should update a component successfully

    TypeError: Cannot delete property 'main' of function () { [native code] }

      29 |
      30 |   afterEach(() => {
    > 31 |     delete (require as any).main;
         |     ^
      32 |   });
      33 |
      34 |   describe('checkForUpdates', () => {

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:31:5)

  ● UpdateManager › updateComponent › should throw error if component is not installed

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      24 |     jest.clearAllMocks();
      25 |     // Mock require.main before creating the instance
    > 26 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      27 |     updateManager = new UpdateManager(mockProjectRoot);
      28 |   });
      29 |

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:26:12)

  ● UpdateManager › updateComponent › should throw error if component is not installed

    TypeError: Cannot delete property 'main' of function () { [native code] }

      29 |
      30 |   afterEach(() => {
    > 31 |     delete (require as any).main;
         |     ^
      32 |   });
      33 |
      34 |   describe('checkForUpdates', () => {

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:31:5)

  ● UpdateManager › updateComponent › should warn about local changes without force flag

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      24 |     jest.clearAllMocks();
      25 |     // Mock require.main before creating the instance
    > 26 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      27 |     updateManager = new UpdateManager(mockProjectRoot);
      28 |   });
      29 |

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:26:12)

  ● UpdateManager › updateComponent › should warn about local changes without force flag

    TypeError: Cannot delete property 'main' of function () { [native code] }

      29 |
      30 |   afterEach(() => {
    > 31 |     delete (require as any).main;
         |     ^
      32 |   });
      33 |
      34 |   describe('checkForUpdates', () => {

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:31:5)

  ● UpdateManager › updateAll › should update all components with available updates

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      24 |     jest.clearAllMocks();
      25 |     // Mock require.main before creating the instance
    > 26 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      27 |     updateManager = new UpdateManager(mockProjectRoot);
      28 |   });
      29 |

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:26:12)

  ● UpdateManager › updateAll › should update all components with available updates

    TypeError: Cannot delete property 'main' of function () { [native code] }

      29 |
      30 |   afterEach(() => {
    > 31 |     delete (require as any).main;
         |     ^
      32 |   });
      33 |
      34 |   describe('checkForUpdates', () => {

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:31:5)

  ● UpdateManager › updateAll › should log when all components are up to date

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      24 |     jest.clearAllMocks();
      25 |     // Mock require.main before creating the instance
    > 26 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      27 |     updateManager = new UpdateManager(mockProjectRoot);
      28 |   });
      29 |

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:26:12)

  ● UpdateManager › updateAll › should log when all components are up to date

    TypeError: Cannot delete property 'main' of function () { [native code] }

      29 |
      30 |   afterEach(() => {
    > 31 |     delete (require as any).main;
         |     ^
      32 |   });
      33 |
      34 |   describe('checkForUpdates', () => {

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:31:5)

  ● UpdateManager › showDiff › should show diff when component has changes

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      24 |     jest.clearAllMocks();
      25 |     // Mock require.main before creating the instance
    > 26 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      27 |     updateManager = new UpdateManager(mockProjectRoot);
      28 |   });
      29 |

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:26:12)

  ● UpdateManager › showDiff › should show diff when component has changes

    TypeError: Cannot delete property 'main' of function () { [native code] }

      29 |
      30 |   afterEach(() => {
    > 31 |     delete (require as any).main;
         |     ^
      32 |   });
      33 |
      34 |   describe('checkForUpdates', () => {

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:31:5)

  ● UpdateManager › showDiff › should indicate when component is up to date

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      24 |     jest.clearAllMocks();
      25 |     // Mock require.main before creating the instance
    > 26 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      27 |     updateManager = new UpdateManager(mockProjectRoot);
      28 |   });
      29 |

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:26:12)

  ● UpdateManager › showDiff › should indicate when component is up to date

    TypeError: Cannot delete property 'main' of function () { [native code] }

      29 |
      30 |   afterEach(() => {
    > 31 |     delete (require as any).main;
         |     ^
      32 |   });
      33 |
      34 |   describe('checkForUpdates', () => {

      at Object.<anonymous> (src/lib/__tests__/updateManager.test.ts:31:5)

 FAIL  src/lib/__tests__/languageOverrideManager-basic.test.ts
  ● LanguageOverrideManager Basic › should create instance correctly

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      20 |   beforeEach(() => {
      21 |     jest.clearAllMocks();
    > 22 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      23 |     
      24 |     (DirectoryManager as jest.MockedClass<typeof DirectoryManager>).mockImplementation(() => ({
      25 |       getComponentPath: jest.fn()

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager-basic.test.ts:22:12)

 FAIL  src/lib/__tests__/languageOverrideManager-coverage.test.ts
  ● Test suite failed to run

    src/lib/__tests__/languageOverrideManager-coverage.test.ts:2:1 - error TS6133: 'existsSync' is declared but its value is never read.

    2 import { existsSync } from 'fs';
      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    src/lib/__tests__/languageOverrideManager-coverage.test.ts:5:1 - error TS6133: 'logger' is declared but its value is never read.

    5 import { logger } from '../logger';
      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

 FAIL  src/lib/__tests__/languageOverrideManager.test.ts
  ● LanguageOverrideManager › detectProjectLanguage › should detect TypeScript project

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      23 |     jest.clearAllMocks();
      24 |     // Mock require.main before creating the instance
    > 25 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      26 |     languageManager = new LanguageOverrideManager(mockProjectRoot);
      27 |   });
      28 |

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager.test.ts:25:12)

  ● LanguageOverrideManager › detectProjectLanguage › should detect Python project

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      23 |     jest.clearAllMocks();
      24 |     // Mock require.main before creating the instance
    > 25 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      26 |     languageManager = new LanguageOverrideManager(mockProjectRoot);
      27 |   });
      28 |

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager.test.ts:25:12)

  ● LanguageOverrideManager › detectProjectLanguage › should detect JavaScript project from package.json

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      23 |     jest.clearAllMocks();
      24 |     // Mock require.main before creating the instance
    > 25 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      26 |     languageManager = new LanguageOverrideManager(mockProjectRoot);
      27 |   });
      28 |

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager.test.ts:25:12)

  ● LanguageOverrideManager › detectProjectLanguage › should detect TypeScript from package.json dependencies

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      23 |     jest.clearAllMocks();
      24 |     // Mock require.main before creating the instance
    > 25 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      26 |     languageManager = new LanguageOverrideManager(mockProjectRoot);
      27 |   });
      28 |

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager.test.ts:25:12)

  ● LanguageOverrideManager › detectProjectLanguage › should return null when no language is detected

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      23 |     jest.clearAllMocks();
      24 |     // Mock require.main before creating the instance
    > 25 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      26 |     languageManager = new LanguageOverrideManager(mockProjectRoot);
      27 |   });
      28 |

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager.test.ts:25:12)

  ● LanguageOverrideManager › detectProjectLanguage › should handle glob patterns for language detection

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      23 |     jest.clearAllMocks();
      24 |     // Mock require.main before creating the instance
    > 25 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      26 |     languageManager = new LanguageOverrideManager(mockProjectRoot);
      27 |   });
      28 |

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager.test.ts:25:12)

  ● LanguageOverrideManager › loadLanguageOverride › should load and cache language override

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      23 |     jest.clearAllMocks();
      24 |     // Mock require.main before creating the instance
    > 25 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      26 |     languageManager = new LanguageOverrideManager(mockProjectRoot);
      27 |   });
      28 |

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager.test.ts:25:12)

  ● LanguageOverrideManager › loadLanguageOverride › should return null for non-existent override

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      23 |     jest.clearAllMocks();
      24 |     // Mock require.main before creating the instance
    > 25 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      26 |     languageManager = new LanguageOverrideManager(mockProjectRoot);
      27 |   });
      28 |

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager.test.ts:25:12)

  ● LanguageOverrideManager › applyWorkflowOverrides › should apply language-specific overrides to workflow

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      23 |     jest.clearAllMocks();
      24 |     // Mock require.main before creating the instance
    > 25 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      26 |     languageManager = new LanguageOverrideManager(mockProjectRoot);
      27 |   });
      28 |

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager.test.ts:25:12)

  ● LanguageOverrideManager › applyWorkflowOverrides › should return original content when no language detected

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      23 |     jest.clearAllMocks();
      24 |     // Mock require.main before creating the instance
    > 25 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      26 |     languageManager = new LanguageOverrideManager(mockProjectRoot);
      27 |   });
      28 |

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager.test.ts:25:12)

  ● LanguageOverrideManager › applyWorkflowOverrides › should return original content when no override exists

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      23 |     jest.clearAllMocks();
      24 |     // Mock require.main before creating the instance
    > 25 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      26 |     languageManager = new LanguageOverrideManager(mockProjectRoot);
      27 |   });
      28 |

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager.test.ts:25:12)

  ● LanguageOverrideManager › applyModeOverrides › should apply language-specific overrides to mode

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      23 |     jest.clearAllMocks();
      24 |     // Mock require.main before creating the instance
    > 25 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      26 |     languageManager = new LanguageOverrideManager(mockProjectRoot);
      27 |   });
      28 |

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager.test.ts:25:12)

  ● LanguageOverrideManager › installLanguageOverride › should install language override successfully

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      23 |     jest.clearAllMocks();
      24 |     // Mock require.main before creating the instance
    > 25 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      26 |     languageManager = new LanguageOverrideManager(mockProjectRoot);
      27 |   });
      28 |

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager.test.ts:25:12)

  ● LanguageOverrideManager › installLanguageOverride › should throw error for non-existent language

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      23 |     jest.clearAllMocks();
      24 |     // Mock require.main before creating the instance
    > 25 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      26 |     languageManager = new LanguageOverrideManager(mockProjectRoot);
      27 |   });
      28 |

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager.test.ts:25:12)

  ● LanguageOverrideManager › autoInstallLanguageOverride › should auto-detect and install appropriate override

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      23 |     jest.clearAllMocks();
      24 |     // Mock require.main before creating the instance
    > 25 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      26 |     languageManager = new LanguageOverrideManager(mockProjectRoot);
      27 |   });
      28 |

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager.test.ts:25:12)

  ● LanguageOverrideManager › autoInstallLanguageOverride › should return null when no language detected

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      23 |     jest.clearAllMocks();
      24 |     // Mock require.main before creating the instance
    > 25 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      26 |     languageManager = new LanguageOverrideManager(mockProjectRoot);
      27 |   });
      28 |

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager.test.ts:25:12)

  ● LanguageOverrideManager › autoInstallLanguageOverride › should warn when no override available for detected language

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      23 |     jest.clearAllMocks();
      24 |     // Mock require.main before creating the instance
    > 25 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      26 |     languageManager = new LanguageOverrideManager(mockProjectRoot);
      27 |   });
      28 |

      at Object.<anonymous> (src/lib/__tests__/languageOverrideManager.test.ts:25:12)

 FAIL  src/commands/__tests__/language-basic.test.ts
  ● Test suite failed to run

    Jest encountered an unexpected token

    Jest failed to parse a file. This happens e.g. when your code or its dependencies use non-standard JavaScript syntax, or when Jest is not configured to support such syntax.

    Out of the box Jest supports Babel, which will be used to transform your files into valid JS based on your Babel configuration.

    By default "node_modules" folder is ignored by transformers.

    Here's what you can do:
     • If you are trying to use ECMAScript Modules, see https://jestjs.io/docs/ecmascript-modules for how to enable it.
     • If you are trying to use TypeScript, see https://jestjs.io/docs/getting-started#using-typescript
     • To have some of your "node_modules" files transformed, you can specify a custom "transformIgnorePatterns" in your config.
     • If you need a custom transformation specify a "transform" option in your config.
     • If you simply want to mock your non-JS modules (e.g. binary assets) you can stub them out with the "moduleNameMapper" config option.

    You'll find more details and examples of these config options in the docs:
    https://jestjs.io/docs/configuration
    For information about custom transformations, see:
    https://jestjs.io/docs/code-transformation

    Details:

    /Users/dazheng/workspace/personal/memento-protocol/node_modules/inquirer/lib/index.js:6
    import { default as List } from './prompts/list.js';
    ^^^^^^

    SyntaxError: Cannot use import statement outside a module

      3 | import { DirectoryManager } from '../lib/directoryManager';
      4 | import { logger } from '../lib/logger';
    > 5 | import inquirer from 'inquirer';
        | ^
      6 |
      7 | export function createLanguageCommand(): Command {
      8 |   const cmd = new Command('language');

      at Runtime.createScriptFromCode (node_modules/jest-runtime/build/index.js:1505:14)
      at Object.<anonymous> (src/commands/language.ts:5:1)
      at Object.<anonymous> (src/commands/__tests__/language-basic.test.ts:1:1)

 FAIL  src/lib/__tests__/interactiveSetup.test.ts
  ● Test suite failed to run

    src/lib/__tests__/interactiveSetup.test.ts:99:49 - error TS2345: Argument of type '{ type: "fullstack"; framework: string; languages: string[]; suggestedModes: string[]; suggestedWorkflows: string[]; files: never[]; dependencies: {}; }' is not assignable to parameter of type 'ProjectInfo'.
      Types of property 'framework' are incompatible.
        Type 'string' is not assignable to type '"react" | "express" | "gin" | "vanilla" | "vue" | "angular" | "nextjs" | "nuxt" | undefined'.

    99       const result = await interactiveSetup.run(mockProjectInfo);
                                                       ~~~~~~~~~~~~~~~
    src/lib/__tests__/interactiveSetup.test.ts:131:34 - error TS2345: Argument of type '{ type: "fullstack"; framework: string; languages: string[]; suggestedModes: string[]; suggestedWorkflows: string[]; files: never[]; dependencies: {}; }' is not assignable to parameter of type 'ProjectInfo'.
      Types of property 'framework' are incompatible.
        Type 'string' is not assignable to type '"react" | "express" | "gin" | "vanilla" | "vue" | "angular" | "nextjs" | "nuxt" | undefined'.

    131       await interactiveSetup.run(mockProjectInfo);
                                         ~~~~~~~~~~~~~~~
    src/lib/__tests__/interactiveSetup.test.ts:154:41 - error TS2345: Argument of type '{ type: "fullstack"; framework: string; languages: string[]; suggestedModes: string[]; suggestedWorkflows: string[]; files: never[]; dependencies: {}; }' is not assignable to parameter of type 'ProjectInfo'.
      Types of property 'framework' are incompatible.
        Type 'string' is not assignable to type '"react" | "express" | "gin" | "vanilla" | "vue" | "angular" | "nextjs" | "nuxt" | undefined'.

    154       await expect(interactiveSetup.run(mockProjectInfo))
                                                ~~~~~~~~~~~~~~~

 FAIL  src/lib/__tests__/componentInstaller-basic.test.ts
  ● ComponentInstaller Basic › should create instance correctly

    TypeError: Cannot redefine property: main
        at Function.defineProperty (<anonymous>)

      20 |   beforeEach(() => {
      21 |     jest.clearAllMocks();
    > 22 |     Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
         |            ^
      23 |     
      24 |     (DirectoryManager as jest.MockedClass<typeof DirectoryManager>).mockImplementation(() => ({
      25 |       getManifest: jest.fn().mockResolvedValue({ components: { modes: [], workflows: [] } }),

      at Object.<anonymous> (src/lib/__tests__/componentInstaller-basic.test.ts:22:12)

 FAIL  src/lib/__tests__/componentInstaller-coverage.test.ts
  ● Test suite failed to run

    src/lib/__tests__/componentInstaller-coverage.test.ts:1:1 - error TS6133: 'fs' is declared but its value is never read.

    1 import * as fs from 'fs/promises';
      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    src/lib/__tests__/componentInstaller-coverage.test.ts:5:1 - error TS6133: 'logger' is declared but its value is never read.

    5 import { logger } from '../logger';
      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

 FAIL  src/commands/__tests__/init-basic.test.ts
  ● Init Command Basic › should successfully run basic init

    expect(jest.fn()).toHaveBeenCalled()

    Expected number of calls: >= 1
    Received number of calls:    0

      81 |
      82 |     expect(mockDirManager.initializeStructure).toHaveBeenCalled();
    > 83 |     expect(mockClaudeMdGen.generate).toHaveBeenCalled();
         |                                      ^
      84 |     expect(logger.success).toHaveBeenCalledWith('Memento Protocol initialized successfully!');
      85 |   });
      86 | });

      at Object.<anonymous> (src/commands/__tests__/init-basic.test.ts:83:38)

 FAIL  src/commands/__tests__/init.test.ts
  ● Init Command › successful initialization › should initialize with quick setup

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Memento Protocol initialized successfully!"
    Received: "
    Memento Protocol initialized successfully!"

    Number of calls: 1

       95 |       expect(mockInteractiveSetup.applySetup).toHaveBeenCalled();
       96 |       expect(mockClaudeMdGen.generate).toHaveBeenCalled();
    >  97 |       expect(logger.success).toHaveBeenCalledWith('Memento Protocol initialized successfully!');
          |                              ^
       98 |     });
       99 |
      100 |     it('should initialize with interactive setup', async () => {

      at Object.<anonymous> (src/commands/__tests__/init.test.ts:97:30)

  ● Init Command › successful initialization › should initialize with interactive setup

    expect(jest.fn()).toHaveBeenCalled()

    Expected number of calls: >= 1
    Received number of calls:    0

      118 |       await initCommand.parseAsync(['node', 'test']);
      119 |
    > 120 |       expect(mockInteractiveSetup.run).toHaveBeenCalled();
          |                                        ^
      121 |       expect(mockInteractiveSetup.applySetup).toHaveBeenCalled();
      122 |     });
      123 |

      at Object.<anonymous> (src/commands/__tests__/init.test.ts:120:40)

  ● Init Command › error handling › should error when already initialized without force flag

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Memento Protocol is already initialized. Use --force to reinitialize."

    Number of calls: 0

      155 |       await initCommand.parseAsync(['node', 'test']);
      156 |
    > 157 |       expect(logger.error).toHaveBeenCalledWith(
          |                            ^
      158 |         'Memento Protocol is already initialized. Use --force to reinitialize.'
      159 |       );
      160 |       expect(process.exit).toHaveBeenCalledWith(1);

      at Object.<anonymous> (src/commands/__tests__/init.test.ts:157:28)

  ● Init Command › error handling › should reinitialize with force flag

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Force reinitializing Memento Protocol..."

    Number of calls: 0

      181 |       await initCommand.parseAsync(['node', 'test', '--force', '--quick']);
      182 |
    > 183 |       expect(logger.warn).toHaveBeenCalledWith('Force reinitializing Memento Protocol...');
          |                           ^
      184 |       expect(mockDirManager.initializeStructure).toHaveBeenCalled();
      185 |     });
      186 |

      at Object.<anonymous> (src/commands/__tests__/init.test.ts:183:27)

  ● Init Command › error handling › should handle initialization errors

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Failed to initialize: Permission denied"
    Received: "Failed to initialize Memento Protocol:", [Error: Permission denied]

    Number of calls: 1

      191 |       await initCommand.parseAsync(['node', 'test', '--quick']);
      192 |
    > 193 |       expect(logger.error).toHaveBeenCalledWith('Failed to initialize: Permission denied');
          |                            ^
      194 |       expect(process.exit).toHaveBeenCalledWith(1);
      195 |     });
      196 |

      at Object.<anonymous> (src/commands/__tests__/init.test.ts:193:28)

  ● Init Command › error handling › should handle setup cancellation

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Failed to initialize: Setup cancelled by user"
    Received: "Failed to initialize Memento Protocol:", [TypeError: Cannot read properties of undefined (reading 'selectedModes')]

    Number of calls: 1

      210 |       await initCommand.parseAsync(['node', 'test']);
      211 |
    > 212 |       expect(logger.error).toHaveBeenCalledWith('Failed to initialize: Setup cancelled by user');
          |                            ^
      213 |       expect(process.exit).toHaveBeenCalledWith(1);
      214 |     });
      215 |   });

      at Object.<anonymous> (src/commands/__tests__/init.test.ts:212:28)


Test Suites: 20 failed, 12 passed, 32 total
Tests:       62 failed, 135 passed, 197 total
Snapshots:   0 total
Time:        4.769 s
Ran all test suites.
```