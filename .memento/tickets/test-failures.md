Here are all the test failures: Please summarize the shared issues using Sonnet sub-agents and then fix them using other subagents

```
➜  memento-protocol git:(main) ✗ npm run test

> memento-protocol@0.1.0 test
> jest

 FAIL  src/lib/__tests__/updateManager.test.ts
  ● Test suite failed to run

    src/lib/__tests__/updateManager.test.ts:26:43 - error TS2345: Argument of type '{ filename: string; }' is not assignable to parameter of type 'Module'.
      Type '{ filename: string; }' is missing the following properties from type 'Module': children, exports, id, isPreloading, and 5 more.

    26     jest.replaceProperty(require, 'main', { filename: '/test/cli.js' });
                                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

 FAIL  src/lib/__tests__/languageOverrideManager.test.ts
  ● Test suite failed to run

    src/lib/__tests__/languageOverrideManager.test.ts:25:43 - error TS2345: Argument of type '{ filename: string; }' is not assignable to parameter of type 'Module'.
      Type '{ filename: string; }' is missing the following properties from type 'Module': children, exports, id, isPreloading, and 5 more.

    25     jest.replaceProperty(require, 'main', { filename: '/test/cli.js' });
                                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

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

 FAIL  src/commands/__tests__/init.test.ts
  ● Test suite failed to run

    src/commands/__tests__/init.test.ts:76:9 - error TS2820: Type '"Next.js"' is not assignable to type '"react" | "express" | "gin" | "vanilla" | "vue" | "angular" | "nextjs" | "nuxt" | undefined'. Did you mean '"nextjs"'?

    76         framework: 'Next.js',
               ~~~~~~~~~
    src/commands/__tests__/init.test.ts:128:8 - error TS2352: Conversion of type 'PromptModule' to type 'Mock<any, any, any>' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
      Type 'PromptModule' is missing the following properties from type 'Mock<any, any, any>': getMockName, mock, mockClear, mockReset, and 13 more.

    128       (inquirer.prompt as jest.Mock).mockResolvedValue({ preserveExisting: true });
               ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

 PASS  src/lib/__tests__/directoryManager.test.ts
 FAIL  src/lib/__tests__/componentInstaller.test.ts
  ● Test suite failed to run

    src/lib/__tests__/componentInstaller.test.ts:36:43 - error TS2345: Argument of type '{ filename: string; }' is not assignable to parameter of type 'Module'.
      Type '{ filename: string; }' is missing the following properties from type 'Module': children, exports, id, isPreloading, and 5 more.

    36     jest.replaceProperty(require, 'main', { filename: '/test/cli.js' });
                                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

error: unknown option '--type'
error: unknown command 'continue'
error: unknown command 'continue'
error: unknown command 'update'
(Did you mean create?)
error: unknown command 'update'
(Did you mean create?)
error: unknown command 'update'
(Did you mean create?)
error: unknown command 'show'
error: unknown command 'show'
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
      ✓ Created ticket: test-feature-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Updated ticket: test-feature-2025-07-14

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Updated ticket: test-feature-2025-07-14

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

 PASS  src/lib/__tests__/configManager.test.ts
  ● Console

    console.log
      ✓ Configuration saved to /var/folders/1d/k648l6ys2jd7x4_s3ls366yh0000gn/T/memento-config-test-1752475844069/.memento/config.json

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Configuration saved to /var/folders/1d/k648l6ys2jd7x4_s3ls366yh0000gn/T/memento-config-test-1752475844084/.memento/config.json

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Configuration saved to /var/folders/1d/k648l6ys2jd7x4_s3ls366yh0000gn/T/memento-config-test-1752475844113/.memento/config.json

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Configuration saved to /var/folders/1d/k648l6ys2jd7x4_s3ls366yh0000gn/T/memento-config-test-1752475844115/.memento/config.json

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Configuration saved to /var/folders/1d/k648l6ys2jd7x4_s3ls366yh0000gn/T/memento-config-test-1752475844115/.memento/config.json

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Configuration saved to /var/folders/1d/k648l6ys2jd7x4_s3ls366yh0000gn/T/memento-config-test-1752475844124/.memento/config.json

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Configuration saved to /var/folders/1d/k648l6ys2jd7x4_s3ls366yh0000gn/T/memento-config-test-1752475844126/.memento/config.json

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Configuration saved to /var/folders/1d/k648l6ys2jd7x4_s3ls366yh0000gn/T/memento-config-test-1752475844126/.memento/config.json

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Configuration saved to /var/folders/1d/k648l6ys2jd7x4_s3ls366yh0000gn/T/memento-config-test-1752475844126/.memento/config.json

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Configuration saved to /var/folders/1d/k648l6ys2jd7x4_s3ls366yh0000gn/T/memento-config-test-1752475844135/global/.memento/config.json

      at Object.success (src/lib/logger.ts:35:13)

    console.log
      ✓ Configuration saved to /var/folders/1d/k648l6ys2jd7x4_s3ls366yh0000gn/T/memento-config-test-1752475844135/.memento/config.json

      at Object.success (src/lib/logger.ts:35:13)

 FAIL  src/commands/__tests__/ticket.test.ts
  ● Ticket Command › create ticket › should create a new ticket

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Add new feature", undefined, undefined

    Number of calls: 0

      53 |       await ticketCommand.parseAsync(['node', 'test', 'create', 'Add new feature']);
      54 |
    > 55 |       expect(mockTicketManager.createTicket).toHaveBeenCalledWith(
         |                                              ^
      56 |         'Add new feature',
      57 |         undefined,
      58 |         undefined

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:55:46)

  ● Ticket Command › create ticket › should create ticket with type and assignee

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Fix bug", "bug", "john"

    Number of calls: 0

      70 |       ]);
      71 |
    > 72 |       expect(mockTicketManager.createTicket).toHaveBeenCalledWith(
         |                                              ^
      73 |         'Fix bug',
      74 |         'bug',
      75 |         'john'

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:72:46)

  ● Ticket Command › list tickets › should list all tickets

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "
    Active Tickets:
    "

    Number of calls: 0

      104 |       await ticketCommand.parseAsync(['node', 'test', 'list']);
      105 |
    > 106 |       expect(logger.info).toHaveBeenCalledWith('\nActive Tickets:\n');
          |                           ^
      107 |       expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('feature-123'));
      108 |       expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('[in_progress]'));
      109 |       expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Alice'));

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:106:27)

  ● Ticket Command › list tickets › should filter tickets by status

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "closed"

    Number of calls: 0

      123 |       await ticketCommand.parseAsync(['node', 'test', 'list', '--status', 'closed']);
      124 |
    > 125 |       expect(mockTicketManager.listTickets).toHaveBeenCalledWith('closed');
          |                                             ^
      126 |     });
      127 |
      128 |     it('should handle no tickets', async () => {

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:125:45)

  ● Ticket Command › list tickets › should handle no tickets

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "No tickets found."

    Number of calls: 0

      131 |       await ticketCommand.parseAsync(['node', 'test', 'list']);
      132 |
    > 133 |       expect(logger.info).toHaveBeenCalledWith('No tickets found.');
          |                           ^
      134 |     });
      135 |   });
      136 |

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:133:27)

  ● Ticket Command › continue ticket › should continue a ticket

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "feature-123"

    Number of calls: 0

      150 |       await ticketCommand.parseAsync(['node', 'test', 'continue', 'feature-123']);
      151 |
    > 152 |       expect(mockTicketManager.continueTicket).toHaveBeenCalledWith('feature-123');
          |                                                ^
      153 |       expect(logger.success).toHaveBeenCalledWith('Continuing ticket: feature-123');
      154 |       expect(logger.info).toHaveBeenCalledWith('Title: Add feature');
      155 |       expect(logger.info).toHaveBeenCalledWith('Status: in_progress');

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:152:48)

  ● Ticket Command › continue ticket › should handle ticket not found

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Ticket not found: nonexistent"

    Number of calls: 0

      162 |       await ticketCommand.parseAsync(['node', 'test', 'continue', 'nonexistent']);
      163 |
    > 164 |       expect(logger.error).toHaveBeenCalledWith('Ticket not found: nonexistent');
          |                            ^
      165 |     });
      166 |   });
      167 |

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:164:28)

  ● Ticket Command › update ticket › should update ticket context

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "feature-123", {"context": "Updated progress notes"}

    Number of calls: 0

      173 |       ]);
      174 |
    > 175 |       expect(mockTicketManager.updateTicket).toHaveBeenCalledWith('feature-123', {
          |                                              ^
      176 |         context: 'Updated progress notes'
      177 |       });
      178 |       expect(logger.success).toHaveBeenCalledWith('Updated ticket: feature-123');

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:175:46)

  ● Ticket Command › update ticket › should update ticket status

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "feature-123", {"status": "resolved"}

    Number of calls: 0

      185 |       ]);
      186 |
    > 187 |       expect(mockTicketManager.updateTicket).toHaveBeenCalledWith('feature-123', {
          |                                              ^
      188 |         status: 'resolved'
      189 |       });
      190 |     });

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:187:46)

  ● Ticket Command › update ticket › should update multiple fields

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "feature-123", {"assignee": "bob", "context": "New context", "status": "in_progress"}

    Number of calls: 0

      198 |       ]);
      199 |
    > 200 |       expect(mockTicketManager.updateTicket).toHaveBeenCalledWith('feature-123', {
          |                                              ^
      201 |         status: 'in_progress',
      202 |         assignee: 'bob',
      203 |         context: 'New context'

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:200:46)

  ● Ticket Command › close ticket › should close a ticket

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "feature-123"

    Number of calls: 0

      210 |       await ticketCommand.parseAsync(['node', 'test', 'close', 'feature-123']);
      211 |
    > 212 |       expect(mockTicketManager.closeTicket).toHaveBeenCalledWith('feature-123');
          |                                             ^
      213 |       expect(logger.success).toHaveBeenCalledWith('Closed ticket: feature-123');
      214 |     });
      215 |   });

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:212:45)

  ● Ticket Command › show ticket › should show ticket details

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "
    Ticket Details:
    "

    Number of calls: 0

      232 |       await ticketCommand.parseAsync(['node', 'test', 'show', 'feature-123']);
      233 |
    > 234 |       expect(logger.info).toHaveBeenCalledWith('\nTicket Details:\n');
          |                           ^
      235 |       expect(logger.info).toHaveBeenCalledWith('ID: feature-123');
      236 |       expect(logger.info).toHaveBeenCalledWith('Title: Add feature');
      237 |       expect(logger.info).toHaveBeenCalledWith('Status: open');

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:234:27)

  ● Ticket Command › show ticket › should handle ticket not found

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Ticket not found: nonexistent"

    Number of calls: 0

      245 |       await ticketCommand.parseAsync(['node', 'test', 'show', 'nonexistent']);
      246 |
    > 247 |       expect(logger.error).toHaveBeenCalledWith('Ticket not found: nonexistent');
          |                            ^
      248 |     });
      249 |   });
      250 |

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:247:28)

  ● Ticket Command › error handling › should error when not initialized

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Memento Protocol is not initialized. Run \"memento init\" first."
    Received: "Failed to list tickets: TypeError: ticketManager.list is not a function"

    Number of calls: 1

      255 |       await ticketCommand.parseAsync(['node', 'test', 'list']);
      256 |
    > 257 |       expect(logger.error).toHaveBeenCalledWith('Memento Protocol is not initialized. Run "memento init" first.');
          |                            ^
      258 |       expect(process.exit).toHaveBeenCalledWith(1);
      259 |     });
      260 |

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:257:28)

  ● Ticket Command › error handling › should handle errors in ticket operations

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Failed to manage ticket: Write error"
    Received: "Failed to create ticket: TypeError: ticketManager.create is not a function"

    Number of calls: 1

      264 |       await ticketCommand.parseAsync(['node', 'test', 'create', 'New ticket']);
      265 |
    > 266 |       expect(logger.error).toHaveBeenCalledWith('Failed to manage ticket: Write error');
          |                            ^
      267 |       expect(process.exit).toHaveBeenCalledWith(1);
      268 |     });
      269 |   });

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:266:28)

 FAIL  src/commands/__tests__/language.test.ts
  ● Test suite failed to run

    src/commands/__tests__/language.test.ts:53:8 - error TS2352: Conversion of type 'PromptModule' to type 'Mock<any, any, any>' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
      Type 'PromptModule' is missing the following properties from type 'Mock<any, any, any>': getMockName, mock, mockClear, mockReset, and 13 more.

    53       (inquirer.prompt as jest.Mock).mockResolvedValue({ install: true });
              ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    src/commands/__tests__/language.test.ts:65:8 - error TS2352: Conversion of type 'PromptModule' to type 'Mock<any, any, any>' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
      Type 'PromptModule' is missing the following properties from type 'Mock<any, any, any>': getMockName, mock, mockClear, mockReset, and 13 more.

    65       (inquirer.prompt as jest.Mock).mockResolvedValue({ language: 'python' });
              ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    src/commands/__tests__/language.test.ts:76:8 - error TS2352: Conversion of type 'PromptModule' to type 'Mock<any, any, any>' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
      Type 'PromptModule' is missing the following properties from type 'Mock<any, any, any>': getMockName, mock, mockClear, mockReset, and 13 more.

    76       (inquirer.prompt as jest.Mock).mockResolvedValue({ install: false });
              ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    src/commands/__tests__/language.test.ts:98:8 - error TS2352: Conversion of type 'PromptModule' to type 'Mock<any, any, any>' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
      Type 'PromptModule' is missing the following properties from type 'Mock<any, any, any>': getMockName, mock, mockClear, mockReset, and 13 more.

    98       (inquirer.prompt as jest.Mock).mockResolvedValue({ install: true });
              ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

 PASS  src/lib/__tests__/projectDetector.test.ts
Usage: config [options] [command]

Manage Memento configuration

Options:
  -h, --help                   display help for command

Commands:
  get <key>                    Get a configuration value
  set [options] <key> <value>  Set a configuration value
  unset [options] <key>        Remove a configuration value
  list [options]               List all configuration values
  help [command]               display help for command
Usage: config [options] [command]

Manage Memento configuration

Options:
  -h, --help                   display help for command

Commands:
  get <key>                    Get a configuration value
  set [options] <key> <value>  Set a configuration value
  unset [options] <key>        Remove a configuration value
  list [options]               List all configuration values
  help [command]               display help for command
Usage: config [options] [command]

Manage Memento configuration

Options:
  -h, --help                   display help for command

Commands:
  get <key>                    Get a configuration value
  set [options] <key> <value>  Set a configuration value
  unset [options] <key>        Remove a configuration value
  list [options]               List all configuration values
  help [command]               display help for command
Usage: config [options] [command]

Manage Memento configuration

Options:
  -h, --help                   display help for command

Commands:
  get <key>                    Get a configuration value
  set [options] <key> <value>  Set a configuration value
  unset [options] <key>        Remove a configuration value
  list [options]               List all configuration values
  help [command]               display help for command
error: unknown command 'defaultMode'
error: unknown command 'nonexistent'
 FAIL  src/lib/__tests__/claudeMdGenerator.test.ts
  ● Test suite failed to run

    src/lib/claudeMdGenerator.ts:58:11 - error TS6133: 'generateRouterContent' is declared but its value is never read.

    58   private generateRouterContent(): string {
                 ~~~~~~~~~~~~~~~~~~~~~

 PASS  src/commands/__tests__/list.test.ts
error: unknown command 'components'
error: unknown command 'defaultMode'
error: unknown command 'components.modes'
error: unknown command 'experimental.enabled'
error: unknown command 'maxTickets'
error: unknown command 'theme'
error: unknown command 'theme'
Usage: config [options] [command]

Manage Memento configuration

Options:
  -h, --help                   display help for command

Commands:
  get <key>                    Get a configuration value
  set [options] <key> <value>  Set a configuration value
  unset [options] <key>        Remove a configuration value
  list [options]               List all configuration values
  help [command]               display help for command
Usage: config [options] [command]

Manage Memento configuration

Options:
  -h, --help                   display help for command

Commands:
  get <key>                    Get a configuration value
  set [options] <key> <value>  Set a configuration value
  unset [options] <key>        Remove a configuration value
  list [options]               List all configuration values
  help [command]               display help for command
Usage: config [options] [command]

Manage Memento configuration

Options:
  -h, --help                   display help for command

Commands:
  get <key>                    Get a configuration value
  set [options] <key> <value>  Set a configuration value
  unset [options] <key>        Remove a configuration value
  list [options]               List all configuration values
  help [command]               display help for command
Usage: config [options] [command]

Manage Memento configuration

Options:
  -h, --help                   display help for command

Commands:
  get <key>                    Get a configuration value
  set [options] <key> <value>  Set a configuration value
  unset [options] <key>        Remove a configuration value
  list [options]               List all configuration values
  help [command]               display help for command
 FAIL  src/commands/__tests__/config.test.ts
  ● Config Command › show all config › should display all configuration when no key provided

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "
    Current Configuration:"

    Number of calls: 0

      57 |       await configCommand.parseAsync(['node', 'test']);
      58 |
    > 59 |       expect(logger.info).toHaveBeenCalledWith('\nCurrent Configuration:');
         |                           ^
      60 |       expect(logger.info).toHaveBeenCalledWith(JSON.stringify(mockConfig, null, 2));
      61 |     });
      62 |

      at Object.<anonymous> (src/commands/__tests__/config.test.ts:59:27)

  ● Config Command › show all config › should handle empty config

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "
    Current Configuration:"

    Number of calls: 0

      66 |       await configCommand.parseAsync(['node', 'test']);
      67 |
    > 68 |       expect(logger.info).toHaveBeenCalledWith('\nCurrent Configuration:');
         |                           ^
      69 |       expect(logger.info).toHaveBeenCalledWith('{}');
      70 |     });
      71 |   });

      at Object.<anonymous> (src/commands/__tests__/config.test.ts:68:27)

  ● Config Command › get specific config › should get a specific config value

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "defaultMode"

    Number of calls: 0

      77 |       await configCommand.parseAsync(['node', 'test', 'defaultMode']);
      78 |
    > 79 |       expect(mockConfigManager.get).toHaveBeenCalledWith('defaultMode');
         |                                     ^
      80 |       expect(logger.info).toHaveBeenCalledWith('defaultMode: architect');
      81 |     });
      82 |

      at Object.<anonymous> (src/commands/__tests__/config.test.ts:79:37)

  ● Config Command › get specific config › should handle undefined config values

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "nonexistent: undefined"

    Number of calls: 0

      86 |       await configCommand.parseAsync(['node', 'test', 'nonexistent']);
      87 |
    > 88 |       expect(logger.info).toHaveBeenCalledWith('nonexistent: undefined');
         |                           ^
      89 |     });
      90 |
      91 |     it('should display complex values as JSON', async () => {

      at Object.<anonymous> (src/commands/__tests__/config.test.ts:88:27)

  ● Config Command › get specific config › should display complex values as JSON

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "components: {\"modes\":[\"architect\",\"engineer\"]}"

    Number of calls: 0

      94 |       await configCommand.parseAsync(['node', 'test', 'components']);
      95 |
    > 96 |       expect(logger.info).toHaveBeenCalledWith('components: {"modes":["architect","engineer"]}');
         |                           ^
      97 |     });
      98 |   });
      99 |

      at Object.<anonymous> (src/commands/__tests__/config.test.ts:96:27)

  ● Config Command › set config › should set a config value

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "defaultMode", "engineer"

    Number of calls: 0

      102 |       await configCommand.parseAsync(['node', 'test', 'defaultMode', 'engineer']);
      103 |
    > 104 |       expect(mockConfigManager.set).toHaveBeenCalledWith('defaultMode', 'engineer');
          |                                     ^
      105 |       expect(mockConfigManager.save).toHaveBeenCalled();
      106 |       expect(logger.success).toHaveBeenCalledWith('Configuration updated: defaultMode = engineer');
      107 |     });

      at Object.<anonymous> (src/commands/__tests__/config.test.ts:104:37)

  ● Config Command › set config › should handle JSON values

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "components.modes", ["architect", "reviewer"]

    Number of calls: 0

      110 |       await configCommand.parseAsync(['node', 'test', 'components.modes', '["architect","reviewer"]']);
      111 |
    > 112 |       expect(mockConfigManager.set).toHaveBeenCalledWith('components.modes', ['architect', 'reviewer']);
          |                                     ^
      113 |     });
      114 |
      115 |     it('should handle boolean values', async () => {

      at Object.<anonymous> (src/commands/__tests__/config.test.ts:112:37)

  ● Config Command › set config › should handle boolean values

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "experimental.enabled", true

    Number of calls: 0

      116 |       await configCommand.parseAsync(['node', 'test', 'experimental.enabled', 'true']);
      117 |
    > 118 |       expect(mockConfigManager.set).toHaveBeenCalledWith('experimental.enabled', true);
          |                                     ^
      119 |     });
      120 |
      121 |     it('should handle numeric values', async () => {

      at Object.<anonymous> (src/commands/__tests__/config.test.ts:118:37)

  ● Config Command › set config › should handle numeric values

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "maxTickets", 10

    Number of calls: 0

      122 |       await configCommand.parseAsync(['node', 'test', 'maxTickets', '10']);
      123 |
    > 124 |       expect(mockConfigManager.set).toHaveBeenCalledWith('maxTickets', 10);
          |                                     ^
      125 |     });
      126 |   });
      127 |

      at Object.<anonymous> (src/commands/__tests__/config.test.ts:124:37)

  ● Config Command › global config › should handle global flag for get

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "theme", true

    Number of calls: 0

      132 |       await configCommand.parseAsync(['node', 'test', 'theme', '--global']);
      133 |
    > 134 |       expect(mockConfigManager.get).toHaveBeenCalledWith('theme', true);
          |                                     ^
      135 |     });
      136 |
      137 |     it('should handle global flag for set', async () => {

      at Object.<anonymous> (src/commands/__tests__/config.test.ts:134:37)

  ● Config Command › global config › should handle global flag for set

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "theme", "light", true

    Number of calls: 0

      138 |       await configCommand.parseAsync(['node', 'test', 'theme', 'light', '--global']);
      139 |
    > 140 |       expect(mockConfigManager.set).toHaveBeenCalledWith('theme', 'light', true);
          |                                     ^
      141 |       expect(mockConfigManager.save).toHaveBeenCalledWith(expect.anything(), true);
      142 |     });
      143 |   });

      at Object.<anonymous> (src/commands/__tests__/config.test.ts:140:37)

  ● Config Command › error handling › should error when not initialized

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Memento Protocol is not initialized. Run \"memento init\" first."

    Number of calls: 0

      149 |       await configCommand.parseAsync(['node', 'test']);
      150 |
    > 151 |       expect(logger.error).toHaveBeenCalledWith('Memento Protocol is not initialized. Run "memento init" first.');
          |                            ^
      152 |       expect(process.exit).toHaveBeenCalledWith(1);
      153 |     });
      154 |

      at Object.<anonymous> (src/commands/__tests__/config.test.ts:151:28)

  ● Config Command › error handling › should handle errors in config operations

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Failed to manage configuration: File not found"

    Number of calls: 0

      158 |       await configCommand.parseAsync(['node', 'test']);
      159 |
    > 160 |       expect(logger.error).toHaveBeenCalledWith('Failed to manage configuration: File not found');
          |                            ^
      161 |       expect(process.exit).toHaveBeenCalledWith(1);
      162 |     });
      163 |   });

      at Object.<anonymous> (src/commands/__tests__/config.test.ts:160:28)

error: unknown command 'show'
error: unknown command 'update'
(Did you mean create?)
error: unknown command 'continue'
 FAIL  src/lib/__tests__/languageOverrideManager-coverage.test.ts
  ● Test suite failed to run

    src/lib/__tests__/languageOverrideManager-coverage.test.ts:2:1 - error TS6133: 'existsSync' is declared but its value is never read.

    2 import { existsSync } from 'fs';
      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    src/lib/__tests__/languageOverrideManager-coverage.test.ts:5:1 - error TS6133: 'logger' is declared but its value is never read.

    5 import { logger } from '../logger';
      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    src/lib/__tests__/languageOverrideManager-coverage.test.ts:25:43 - error TS2345: Argument of type '{ filename: string; }' is not assignable to parameter of type 'Module'.
      Type '{ filename: string; }' is missing the following properties from type 'Module': children, exports, id, isPreloading, and 5 more.

    25     jest.replaceProperty(require, 'main', { filename: '/test/cli.js' });
                                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

 FAIL  src/commands/__tests__/update.test.ts
  ● Update Command › update specific component › should update a specific component

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "mode", "architect", false
    Received: "mode", "architect", undefined

    Number of calls: 1

      81 |       await cmd.parseAsync(['node', 'test', 'mode:architect']);
      82 |
    > 83 |       expect(mockUpdateManager.updateComponent).toHaveBeenCalledWith('mode', 'architect', false);
         |                                                 ^
      84 |     });
      85 |
      86 |     it('should force update with --force flag', async () => {

      at Object.<anonymous> (src/commands/__tests__/update.test.ts:83:49)

  ● Update Command › update all components › should update all components

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: false
    Received: undefined

    Number of calls: 1

      105 |       await cmd.parseAsync(['node', 'test']);
      106 |
    > 107 |       expect(mockUpdateManager.updateAll).toHaveBeenCalledWith(false);
          |                                           ^
      108 |     });
      109 |
      110 |     it('should force update all with --force flag', async () => {

      at Object.<anonymous> (src/commands/__tests__/update.test.ts:107:43)

 FAIL  src/lib/__tests__/updateManager-coverage.test.ts
  ● Test suite failed to run

    src/lib/__tests__/updateManager-coverage.test.ts:2:1 - error TS6133: 'existsSync' is declared but its value is never read.

    2 import { existsSync } from 'fs';
      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    src/lib/__tests__/updateManager-coverage.test.ts:26:43 - error TS2345: Argument of type '{ filename: string; }' is not assignable to parameter of type 'Module'.
      Type '{ filename: string; }' is missing the following properties from type 'Module': children, exports, id, isPreloading, and 5 more.

    26     jest.replaceProperty(require, 'main', { filename: '/test/cli.js' });
                                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

 FAIL  src/commands/__tests__/ticket-basic.test.ts
  ● Ticket Command Basic Coverage › should create ticket with basic params

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Test ticket", undefined, undefined

    Number of calls: 0

      50 |     await ticketCommand.parseAsync(['node', 'test', 'create', 'Test ticket']);
      51 |     
    > 52 |     expect(mockTicketManager.createTicket).toHaveBeenCalledWith('Test ticket', undefined, undefined);
         |                                            ^
      53 |     expect(logger.success).toHaveBeenCalledWith('Created ticket: test-123');
      54 |   });
      55 |

      at Object.<anonymous> (src/commands/__tests__/ticket-basic.test.ts:52:44)

  ● Ticket Command Basic Coverage › should handle show command

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "
    Ticket Details:
    "

    Number of calls: 0

      65 |     await ticketCommand.parseAsync(['node', 'test', 'show', 'test-123']);
      66 |     
    > 67 |     expect(logger.info).toHaveBeenCalledWith('\nTicket Details:\n');
         |                         ^
      68 |     expect(logger.info).toHaveBeenCalledWith('ID: test-123');
      69 |   });
      70 |

      at Object.<anonymous> (src/commands/__tests__/ticket-basic.test.ts:67:25)

  ● Ticket Command Basic Coverage › should handle close command

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "test-123"

    Number of calls: 0

      72 |     await ticketCommand.parseAsync(['node', 'test', 'close', 'test-123']);
      73 |     
    > 74 |     expect(mockTicketManager.closeTicket).toHaveBeenCalledWith('test-123');
         |                                           ^
      75 |     expect(logger.success).toHaveBeenCalledWith('Closed ticket: test-123');
      76 |   });
      77 |

      at Object.<anonymous> (src/commands/__tests__/ticket-basic.test.ts:74:43)

  ● Ticket Command Basic Coverage › should handle update command with context

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "test-123", {"context": "New context"}

    Number of calls: 0

      79 |     await ticketCommand.parseAsync(['node', 'test', 'update', 'test-123', '--context', 'New context']);
      80 |     
    > 81 |     expect(mockTicketManager.updateTicket).toHaveBeenCalledWith('test-123', { context: 'New context' });
         |                                            ^
      82 |     expect(logger.success).toHaveBeenCalledWith('Updated ticket: test-123');
      83 |   });
      84 |

      at Object.<anonymous> (src/commands/__tests__/ticket-basic.test.ts:81:44)

  ● Ticket Command Basic Coverage › should handle continue command with existing ticket

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "test-123"

    Number of calls: 0

       95 |     await ticketCommand.parseAsync(['node', 'test', 'continue', 'test-123']);
       96 |     
    >  97 |     expect(mockTicketManager.continueTicket).toHaveBeenCalledWith('test-123');
          |                                              ^
       98 |     expect(logger.success).toHaveBeenCalledWith('Continuing ticket: test-123');
       99 |     expect(logger.info).toHaveBeenCalledWith('Title: Test');
      100 |     expect(logger.info).toHaveBeenCalledWith('Status: in_progress');

      at Object.<anonymous> (src/commands/__tests__/ticket-basic.test.ts:97:46)

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

 FAIL  src/commands/__tests__/init-basic.test.ts
  ● Test suite failed to run

    src/lib/claudeMdGenerator.ts:58:11 - error TS6133: 'generateRouterContent' is declared but its value is never read.

    58   private generateRouterContent(): string {
                 ~~~~~~~~~~~~~~~~~~~~~

error: unknown command 'someKey'
error: unknown command 'someKey'
 FAIL  src/commands/__tests__/config-basic.test.ts
  ● Config Command Basic › should handle basic get operations

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "someKey"

    Number of calls: 0

      49 |     await configCommand.parseAsync(['node', 'test', 'someKey']);
      50 |     
    > 51 |     expect(mockConfigManager.get).toHaveBeenCalledWith('someKey');
         |                                   ^
      52 |     expect(logger.info).toHaveBeenCalledWith('someKey: test-value');
      53 |   });
      54 |

      at Object.<anonymous> (src/commands/__tests__/config-basic.test.ts:51:35)

  ● Config Command Basic › should handle basic set operations

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "someKey", "someValue"

    Number of calls: 0

      56 |     await configCommand.parseAsync(['node', 'test', 'someKey', 'someValue']);
      57 |     
    > 58 |     expect(mockConfigManager.set).toHaveBeenCalledWith('someKey', 'someValue');
         |                                   ^
      59 |     expect(mockConfigManager.save).toHaveBeenCalled();
      60 |     expect(logger.success).toHaveBeenCalledWith('Configuration updated: someKey = someValue');
      61 |   });

      at Object.<anonymous> (src/commands/__tests__/config-basic.test.ts:58:35)

 FAIL  src/lib/__tests__/componentInstaller-coverage.test.ts
  ● Test suite failed to run

    src/lib/__tests__/componentInstaller-coverage.test.ts:1:1 - error TS6133: 'fs' is declared but its value is never read.

    1 import * as fs from 'fs/promises';
      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    src/lib/__tests__/componentInstaller-coverage.test.ts:5:1 - error TS6133: 'logger' is declared but its value is never read.

    5 import { logger } from '../logger';
      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    src/lib/__tests__/componentInstaller-coverage.test.ts:26:43 - error TS2345: Argument of type '{ filename: string; }' is not assignable to parameter of type 'Module'.
      Type '{ filename: string; }' is missing the following properties from type 'Module': children, exports, id, isPreloading, and 5 more.

    26     jest.replaceProperty(require, 'main', { filename: '/test/cli.js' });
                                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

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

For more information, visit: https://github.com/memento-protocol/memento-protocol
Documentation: https://github.com/memento-protocol/memento-protocol#readme
 FAIL  src/lib/__tests__/updateManager-basic.test.ts
  ● Test suite failed to run

    src/lib/__tests__/updateManager-basic.test.ts:1:1 - error TS6133: 'fs' is declared but its value is never read.

    1 import * as fs from 'fs/promises';
      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    src/lib/__tests__/updateManager-basic.test.ts:23:43 - error TS2345: Argument of type '{ filename: string; }' is not assignable to parameter of type 'Module'.
      Type '{ filename: string; }' is missing the following properties from type 'Module': children, exports, id, isPreloading, and 5 more.

    23     jest.replaceProperty(require, 'main', { filename: '/test/cli.js' });
                                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

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

For more information, visit: https://github.com/memento-protocol/memento-protocol
Documentation: https://github.com/memento-protocol/memento-protocol#readme
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

For more information, visit: https://github.com/memento-protocol/memento-protocol
Documentation: https://github.com/memento-protocol/memento-protocol#readme
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

For more information, visit: https://github.com/memento-protocol/memento-protocol
Documentation: https://github.com/memento-protocol/memento-protocol#readme
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

For more information, visit: https://github.com/memento-protocol/memento-protocol
Documentation: https://github.com/memento-protocol/memento-protocol#readme
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

For more information, visit: https://github.com/memento-protocol/memento-protocol
Documentation: https://github.com/memento-protocol/memento-protocol#readme
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

For more information, visit: https://github.com/memento-protocol/memento-protocol
Documentation: https://github.com/memento-protocol/memento-protocol#readme
0.1.0
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

 FAIL  src/lib/__tests__/componentInstaller-basic.test.ts
  ● Test suite failed to run

    src/lib/__tests__/componentInstaller-basic.test.ts:22:43 - error TS2345: Argument of type '{ filename: string; }' is not assignable to parameter of type 'Module'.
      Type '{ filename: string; }' is missing the following properties from type 'Module': children, exports, id, isPreloading, and 5 more.

    22     jest.replaceProperty(require, 'main', { filename: '/test/cli.js' });
                                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

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

 FAIL  src/lib/__tests__/languageOverrideManager-basic.test.ts
  ● Test suite failed to run

    src/lib/__tests__/languageOverrideManager-basic.test.ts:22:43 - error TS2345: Argument of type '{ filename: string; }' is not assignable to parameter of type 'Module'.
      Type '{ filename: string; }' is missing the following properties from type 'Module': children, exports, id, isPreloading, and 5 more.

    22     jest.replaceProperty(require, 'main', { filename: '/test/cli.js' });
                                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

 PASS  src/lib/__tests__/interactiveSetup-basic.test.ts

Summary of all failing tests
 FAIL  src/lib/__tests__/updateManager.test.ts
  ● Test suite failed to run

    src/lib/__tests__/updateManager.test.ts:26:43 - error TS2345: Argument of type '{ filename: string; }' is not assignable to parameter of type 'Module'.
      Type '{ filename: string; }' is missing the following properties from type 'Module': children, exports, id, isPreloading, and 5 more.

    26     jest.replaceProperty(require, 'main', { filename: '/test/cli.js' });
                                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

 FAIL  src/lib/__tests__/languageOverrideManager.test.ts
  ● Test suite failed to run

    src/lib/__tests__/languageOverrideManager.test.ts:25:43 - error TS2345: Argument of type '{ filename: string; }' is not assignable to parameter of type 'Module'.
      Type '{ filename: string; }' is missing the following properties from type 'Module': children, exports, id, isPreloading, and 5 more.

    25     jest.replaceProperty(require, 'main', { filename: '/test/cli.js' });
                                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

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

 FAIL  src/commands/__tests__/init.test.ts
  ● Test suite failed to run

    src/commands/__tests__/init.test.ts:76:9 - error TS2820: Type '"Next.js"' is not assignable to type '"react" | "express" | "gin" | "vanilla" | "vue" | "angular" | "nextjs" | "nuxt" | undefined'. Did you mean '"nextjs"'?

    76         framework: 'Next.js',
               ~~~~~~~~~
    src/commands/__tests__/init.test.ts:128:8 - error TS2352: Conversion of type 'PromptModule' to type 'Mock<any, any, any>' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
      Type 'PromptModule' is missing the following properties from type 'Mock<any, any, any>': getMockName, mock, mockClear, mockReset, and 13 more.

    128       (inquirer.prompt as jest.Mock).mockResolvedValue({ preserveExisting: true });
               ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

 FAIL  src/lib/__tests__/componentInstaller.test.ts
  ● Test suite failed to run

    src/lib/__tests__/componentInstaller.test.ts:36:43 - error TS2345: Argument of type '{ filename: string; }' is not assignable to parameter of type 'Module'.
      Type '{ filename: string; }' is missing the following properties from type 'Module': children, exports, id, isPreloading, and 5 more.

    36     jest.replaceProperty(require, 'main', { filename: '/test/cli.js' });
                                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

 FAIL  src/commands/__tests__/ticket.test.ts
  ● Ticket Command › create ticket › should create a new ticket

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Add new feature", undefined, undefined

    Number of calls: 0

      53 |       await ticketCommand.parseAsync(['node', 'test', 'create', 'Add new feature']);
      54 |
    > 55 |       expect(mockTicketManager.createTicket).toHaveBeenCalledWith(
         |                                              ^
      56 |         'Add new feature',
      57 |         undefined,
      58 |         undefined

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:55:46)

  ● Ticket Command › create ticket › should create ticket with type and assignee

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Fix bug", "bug", "john"

    Number of calls: 0

      70 |       ]);
      71 |
    > 72 |       expect(mockTicketManager.createTicket).toHaveBeenCalledWith(
         |                                              ^
      73 |         'Fix bug',
      74 |         'bug',
      75 |         'john'

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:72:46)

  ● Ticket Command › list tickets › should list all tickets

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "
    Active Tickets:
    "

    Number of calls: 0

      104 |       await ticketCommand.parseAsync(['node', 'test', 'list']);
      105 |
    > 106 |       expect(logger.info).toHaveBeenCalledWith('\nActive Tickets:\n');
          |                           ^
      107 |       expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('feature-123'));
      108 |       expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('[in_progress]'));
      109 |       expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Alice'));

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:106:27)

  ● Ticket Command › list tickets › should filter tickets by status

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "closed"

    Number of calls: 0

      123 |       await ticketCommand.parseAsync(['node', 'test', 'list', '--status', 'closed']);
      124 |
    > 125 |       expect(mockTicketManager.listTickets).toHaveBeenCalledWith('closed');
          |                                             ^
      126 |     });
      127 |
      128 |     it('should handle no tickets', async () => {

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:125:45)

  ● Ticket Command › list tickets › should handle no tickets

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "No tickets found."

    Number of calls: 0

      131 |       await ticketCommand.parseAsync(['node', 'test', 'list']);
      132 |
    > 133 |       expect(logger.info).toHaveBeenCalledWith('No tickets found.');
          |                           ^
      134 |     });
      135 |   });
      136 |

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:133:27)

  ● Ticket Command › continue ticket › should continue a ticket

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "feature-123"

    Number of calls: 0

      150 |       await ticketCommand.parseAsync(['node', 'test', 'continue', 'feature-123']);
      151 |
    > 152 |       expect(mockTicketManager.continueTicket).toHaveBeenCalledWith('feature-123');
          |                                                ^
      153 |       expect(logger.success).toHaveBeenCalledWith('Continuing ticket: feature-123');
      154 |       expect(logger.info).toHaveBeenCalledWith('Title: Add feature');
      155 |       expect(logger.info).toHaveBeenCalledWith('Status: in_progress');

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:152:48)

  ● Ticket Command › continue ticket › should handle ticket not found

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Ticket not found: nonexistent"

    Number of calls: 0

      162 |       await ticketCommand.parseAsync(['node', 'test', 'continue', 'nonexistent']);
      163 |
    > 164 |       expect(logger.error).toHaveBeenCalledWith('Ticket not found: nonexistent');
          |                            ^
      165 |     });
      166 |   });
      167 |

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:164:28)

  ● Ticket Command › update ticket › should update ticket context

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "feature-123", {"context": "Updated progress notes"}

    Number of calls: 0

      173 |       ]);
      174 |
    > 175 |       expect(mockTicketManager.updateTicket).toHaveBeenCalledWith('feature-123', {
          |                                              ^
      176 |         context: 'Updated progress notes'
      177 |       });
      178 |       expect(logger.success).toHaveBeenCalledWith('Updated ticket: feature-123');

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:175:46)

  ● Ticket Command › update ticket › should update ticket status

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "feature-123", {"status": "resolved"}

    Number of calls: 0

      185 |       ]);
      186 |
    > 187 |       expect(mockTicketManager.updateTicket).toHaveBeenCalledWith('feature-123', {
          |                                              ^
      188 |         status: 'resolved'
      189 |       });
      190 |     });

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:187:46)

  ● Ticket Command › update ticket › should update multiple fields

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "feature-123", {"assignee": "bob", "context": "New context", "status": "in_progress"}

    Number of calls: 0

      198 |       ]);
      199 |
    > 200 |       expect(mockTicketManager.updateTicket).toHaveBeenCalledWith('feature-123', {
          |                                              ^
      201 |         status: 'in_progress',
      202 |         assignee: 'bob',
      203 |         context: 'New context'

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:200:46)

  ● Ticket Command › close ticket › should close a ticket

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "feature-123"

    Number of calls: 0

      210 |       await ticketCommand.parseAsync(['node', 'test', 'close', 'feature-123']);
      211 |
    > 212 |       expect(mockTicketManager.closeTicket).toHaveBeenCalledWith('feature-123');
          |                                             ^
      213 |       expect(logger.success).toHaveBeenCalledWith('Closed ticket: feature-123');
      214 |     });
      215 |   });

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:212:45)

  ● Ticket Command › show ticket › should show ticket details

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "
    Ticket Details:
    "

    Number of calls: 0

      232 |       await ticketCommand.parseAsync(['node', 'test', 'show', 'feature-123']);
      233 |
    > 234 |       expect(logger.info).toHaveBeenCalledWith('\nTicket Details:\n');
          |                           ^
      235 |       expect(logger.info).toHaveBeenCalledWith('ID: feature-123');
      236 |       expect(logger.info).toHaveBeenCalledWith('Title: Add feature');
      237 |       expect(logger.info).toHaveBeenCalledWith('Status: open');

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:234:27)

  ● Ticket Command › show ticket › should handle ticket not found

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Ticket not found: nonexistent"

    Number of calls: 0

      245 |       await ticketCommand.parseAsync(['node', 'test', 'show', 'nonexistent']);
      246 |
    > 247 |       expect(logger.error).toHaveBeenCalledWith('Ticket not found: nonexistent');
          |                            ^
      248 |     });
      249 |   });
      250 |

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:247:28)

  ● Ticket Command › error handling › should error when not initialized

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Memento Protocol is not initialized. Run \"memento init\" first."
    Received: "Failed to list tickets: TypeError: ticketManager.list is not a function"

    Number of calls: 1

      255 |       await ticketCommand.parseAsync(['node', 'test', 'list']);
      256 |
    > 257 |       expect(logger.error).toHaveBeenCalledWith('Memento Protocol is not initialized. Run "memento init" first.');
          |                            ^
      258 |       expect(process.exit).toHaveBeenCalledWith(1);
      259 |     });
      260 |

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:257:28)

  ● Ticket Command › error handling › should handle errors in ticket operations

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Failed to manage ticket: Write error"
    Received: "Failed to create ticket: TypeError: ticketManager.create is not a function"

    Number of calls: 1

      264 |       await ticketCommand.parseAsync(['node', 'test', 'create', 'New ticket']);
      265 |
    > 266 |       expect(logger.error).toHaveBeenCalledWith('Failed to manage ticket: Write error');
          |                            ^
      267 |       expect(process.exit).toHaveBeenCalledWith(1);
      268 |     });
      269 |   });

      at Object.<anonymous> (src/commands/__tests__/ticket.test.ts:266:28)

 FAIL  src/commands/__tests__/language.test.ts
  ● Test suite failed to run

    src/commands/__tests__/language.test.ts:53:8 - error TS2352: Conversion of type 'PromptModule' to type 'Mock<any, any, any>' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
      Type 'PromptModule' is missing the following properties from type 'Mock<any, any, any>': getMockName, mock, mockClear, mockReset, and 13 more.

    53       (inquirer.prompt as jest.Mock).mockResolvedValue({ install: true });
              ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    src/commands/__tests__/language.test.ts:65:8 - error TS2352: Conversion of type 'PromptModule' to type 'Mock<any, any, any>' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
      Type 'PromptModule' is missing the following properties from type 'Mock<any, any, any>': getMockName, mock, mockClear, mockReset, and 13 more.

    65       (inquirer.prompt as jest.Mock).mockResolvedValue({ language: 'python' });
              ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    src/commands/__tests__/language.test.ts:76:8 - error TS2352: Conversion of type 'PromptModule' to type 'Mock<any, any, any>' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
      Type 'PromptModule' is missing the following properties from type 'Mock<any, any, any>': getMockName, mock, mockClear, mockReset, and 13 more.

    76       (inquirer.prompt as jest.Mock).mockResolvedValue({ install: false });
              ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    src/commands/__tests__/language.test.ts:98:8 - error TS2352: Conversion of type 'PromptModule' to type 'Mock<any, any, any>' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
      Type 'PromptModule' is missing the following properties from type 'Mock<any, any, any>': getMockName, mock, mockClear, mockReset, and 13 more.

    98       (inquirer.prompt as jest.Mock).mockResolvedValue({ install: true });
              ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

 FAIL  src/lib/__tests__/claudeMdGenerator.test.ts
  ● Test suite failed to run

    src/lib/claudeMdGenerator.ts:58:11 - error TS6133: 'generateRouterContent' is declared but its value is never read.

    58   private generateRouterContent(): string {
                 ~~~~~~~~~~~~~~~~~~~~~

 FAIL  src/commands/__tests__/config.test.ts
  ● Config Command › show all config › should display all configuration when no key provided

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "
    Current Configuration:"

    Number of calls: 0

      57 |       await configCommand.parseAsync(['node', 'test']);
      58 |
    > 59 |       expect(logger.info).toHaveBeenCalledWith('\nCurrent Configuration:');
         |                           ^
      60 |       expect(logger.info).toHaveBeenCalledWith(JSON.stringify(mockConfig, null, 2));
      61 |     });
      62 |

      at Object.<anonymous> (src/commands/__tests__/config.test.ts:59:27)

  ● Config Command › show all config › should handle empty config

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "
    Current Configuration:"

    Number of calls: 0

      66 |       await configCommand.parseAsync(['node', 'test']);
      67 |
    > 68 |       expect(logger.info).toHaveBeenCalledWith('\nCurrent Configuration:');
         |                           ^
      69 |       expect(logger.info).toHaveBeenCalledWith('{}');
      70 |     });
      71 |   });

      at Object.<anonymous> (src/commands/__tests__/config.test.ts:68:27)

  ● Config Command › get specific config › should get a specific config value

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "defaultMode"

    Number of calls: 0

      77 |       await configCommand.parseAsync(['node', 'test', 'defaultMode']);
      78 |
    > 79 |       expect(mockConfigManager.get).toHaveBeenCalledWith('defaultMode');
         |                                     ^
      80 |       expect(logger.info).toHaveBeenCalledWith('defaultMode: architect');
      81 |     });
      82 |

      at Object.<anonymous> (src/commands/__tests__/config.test.ts:79:37)

  ● Config Command › get specific config › should handle undefined config values

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "nonexistent: undefined"

    Number of calls: 0

      86 |       await configCommand.parseAsync(['node', 'test', 'nonexistent']);
      87 |
    > 88 |       expect(logger.info).toHaveBeenCalledWith('nonexistent: undefined');
         |                           ^
      89 |     });
      90 |
      91 |     it('should display complex values as JSON', async () => {

      at Object.<anonymous> (src/commands/__tests__/config.test.ts:88:27)

  ● Config Command › get specific config › should display complex values as JSON

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "components: {\"modes\":[\"architect\",\"engineer\"]}"

    Number of calls: 0

      94 |       await configCommand.parseAsync(['node', 'test', 'components']);
      95 |
    > 96 |       expect(logger.info).toHaveBeenCalledWith('components: {"modes":["architect","engineer"]}');
         |                           ^
      97 |     });
      98 |   });
      99 |

      at Object.<anonymous> (src/commands/__tests__/config.test.ts:96:27)

  ● Config Command › set config › should set a config value

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "defaultMode", "engineer"

    Number of calls: 0

      102 |       await configCommand.parseAsync(['node', 'test', 'defaultMode', 'engineer']);
      103 |
    > 104 |       expect(mockConfigManager.set).toHaveBeenCalledWith('defaultMode', 'engineer');
          |                                     ^
      105 |       expect(mockConfigManager.save).toHaveBeenCalled();
      106 |       expect(logger.success).toHaveBeenCalledWith('Configuration updated: defaultMode = engineer');
      107 |     });

      at Object.<anonymous> (src/commands/__tests__/config.test.ts:104:37)

  ● Config Command › set config › should handle JSON values

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "components.modes", ["architect", "reviewer"]

    Number of calls: 0

      110 |       await configCommand.parseAsync(['node', 'test', 'components.modes', '["architect","reviewer"]']);
      111 |
    > 112 |       expect(mockConfigManager.set).toHaveBeenCalledWith('components.modes', ['architect', 'reviewer']);
          |                                     ^
      113 |     });
      114 |
      115 |     it('should handle boolean values', async () => {

      at Object.<anonymous> (src/commands/__tests__/config.test.ts:112:37)

  ● Config Command › set config › should handle boolean values

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "experimental.enabled", true

    Number of calls: 0

      116 |       await configCommand.parseAsync(['node', 'test', 'experimental.enabled', 'true']);
      117 |
    > 118 |       expect(mockConfigManager.set).toHaveBeenCalledWith('experimental.enabled', true);
          |                                     ^
      119 |     });
      120 |
      121 |     it('should handle numeric values', async () => {

      at Object.<anonymous> (src/commands/__tests__/config.test.ts:118:37)

  ● Config Command › set config › should handle numeric values

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "maxTickets", 10

    Number of calls: 0

      122 |       await configCommand.parseAsync(['node', 'test', 'maxTickets', '10']);
      123 |
    > 124 |       expect(mockConfigManager.set).toHaveBeenCalledWith('maxTickets', 10);
          |                                     ^
      125 |     });
      126 |   });
      127 |

      at Object.<anonymous> (src/commands/__tests__/config.test.ts:124:37)

  ● Config Command › global config › should handle global flag for get

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "theme", true

    Number of calls: 0

      132 |       await configCommand.parseAsync(['node', 'test', 'theme', '--global']);
      133 |
    > 134 |       expect(mockConfigManager.get).toHaveBeenCalledWith('theme', true);
          |                                     ^
      135 |     });
      136 |
      137 |     it('should handle global flag for set', async () => {

      at Object.<anonymous> (src/commands/__tests__/config.test.ts:134:37)

  ● Config Command › global config › should handle global flag for set

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "theme", "light", true

    Number of calls: 0

      138 |       await configCommand.parseAsync(['node', 'test', 'theme', 'light', '--global']);
      139 |
    > 140 |       expect(mockConfigManager.set).toHaveBeenCalledWith('theme', 'light', true);
          |                                     ^
      141 |       expect(mockConfigManager.save).toHaveBeenCalledWith(expect.anything(), true);
      142 |     });
      143 |   });

      at Object.<anonymous> (src/commands/__tests__/config.test.ts:140:37)

  ● Config Command › error handling › should error when not initialized

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Memento Protocol is not initialized. Run \"memento init\" first."

    Number of calls: 0

      149 |       await configCommand.parseAsync(['node', 'test']);
      150 |
    > 151 |       expect(logger.error).toHaveBeenCalledWith('Memento Protocol is not initialized. Run "memento init" first.');
          |                            ^
      152 |       expect(process.exit).toHaveBeenCalledWith(1);
      153 |     });
      154 |

      at Object.<anonymous> (src/commands/__tests__/config.test.ts:151:28)

  ● Config Command › error handling › should handle errors in config operations

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Failed to manage configuration: File not found"

    Number of calls: 0

      158 |       await configCommand.parseAsync(['node', 'test']);
      159 |
    > 160 |       expect(logger.error).toHaveBeenCalledWith('Failed to manage configuration: File not found');
          |                            ^
      161 |       expect(process.exit).toHaveBeenCalledWith(1);
      162 |     });
      163 |   });

      at Object.<anonymous> (src/commands/__tests__/config.test.ts:160:28)

 FAIL  src/lib/__tests__/languageOverrideManager-coverage.test.ts
  ● Test suite failed to run

    src/lib/__tests__/languageOverrideManager-coverage.test.ts:2:1 - error TS6133: 'existsSync' is declared but its value is never read.

    2 import { existsSync } from 'fs';
      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    src/lib/__tests__/languageOverrideManager-coverage.test.ts:5:1 - error TS6133: 'logger' is declared but its value is never read.

    5 import { logger } from '../logger';
      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    src/lib/__tests__/languageOverrideManager-coverage.test.ts:25:43 - error TS2345: Argument of type '{ filename: string; }' is not assignable to parameter of type 'Module'.
      Type '{ filename: string; }' is missing the following properties from type 'Module': children, exports, id, isPreloading, and 5 more.

    25     jest.replaceProperty(require, 'main', { filename: '/test/cli.js' });
                                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

 FAIL  src/commands/__tests__/update.test.ts
  ● Update Command › update specific component › should update a specific component

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "mode", "architect", false
    Received: "mode", "architect", undefined

    Number of calls: 1

      81 |       await cmd.parseAsync(['node', 'test', 'mode:architect']);
      82 |
    > 83 |       expect(mockUpdateManager.updateComponent).toHaveBeenCalledWith('mode', 'architect', false);
         |                                                 ^
      84 |     });
      85 |
      86 |     it('should force update with --force flag', async () => {

      at Object.<anonymous> (src/commands/__tests__/update.test.ts:83:49)

  ● Update Command › update all components › should update all components

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: false
    Received: undefined

    Number of calls: 1

      105 |       await cmd.parseAsync(['node', 'test']);
      106 |
    > 107 |       expect(mockUpdateManager.updateAll).toHaveBeenCalledWith(false);
          |                                           ^
      108 |     });
      109 |
      110 |     it('should force update all with --force flag', async () => {

      at Object.<anonymous> (src/commands/__tests__/update.test.ts:107:43)

 FAIL  src/lib/__tests__/updateManager-coverage.test.ts
  ● Test suite failed to run

    src/lib/__tests__/updateManager-coverage.test.ts:2:1 - error TS6133: 'existsSync' is declared but its value is never read.

    2 import { existsSync } from 'fs';
      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    src/lib/__tests__/updateManager-coverage.test.ts:26:43 - error TS2345: Argument of type '{ filename: string; }' is not assignable to parameter of type 'Module'.
      Type '{ filename: string; }' is missing the following properties from type 'Module': children, exports, id, isPreloading, and 5 more.

    26     jest.replaceProperty(require, 'main', { filename: '/test/cli.js' });
                                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

 FAIL  src/commands/__tests__/ticket-basic.test.ts
  ● Ticket Command Basic Coverage › should create ticket with basic params

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "Test ticket", undefined, undefined

    Number of calls: 0

      50 |     await ticketCommand.parseAsync(['node', 'test', 'create', 'Test ticket']);
      51 |     
    > 52 |     expect(mockTicketManager.createTicket).toHaveBeenCalledWith('Test ticket', undefined, undefined);
         |                                            ^
      53 |     expect(logger.success).toHaveBeenCalledWith('Created ticket: test-123');
      54 |   });
      55 |

      at Object.<anonymous> (src/commands/__tests__/ticket-basic.test.ts:52:44)

  ● Ticket Command Basic Coverage › should handle show command

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "
    Ticket Details:
    "

    Number of calls: 0

      65 |     await ticketCommand.parseAsync(['node', 'test', 'show', 'test-123']);
      66 |     
    > 67 |     expect(logger.info).toHaveBeenCalledWith('\nTicket Details:\n');
         |                         ^
      68 |     expect(logger.info).toHaveBeenCalledWith('ID: test-123');
      69 |   });
      70 |

      at Object.<anonymous> (src/commands/__tests__/ticket-basic.test.ts:67:25)

  ● Ticket Command Basic Coverage › should handle close command

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "test-123"

    Number of calls: 0

      72 |     await ticketCommand.parseAsync(['node', 'test', 'close', 'test-123']);
      73 |     
    > 74 |     expect(mockTicketManager.closeTicket).toHaveBeenCalledWith('test-123');
         |                                           ^
      75 |     expect(logger.success).toHaveBeenCalledWith('Closed ticket: test-123');
      76 |   });
      77 |

      at Object.<anonymous> (src/commands/__tests__/ticket-basic.test.ts:74:43)

  ● Ticket Command Basic Coverage › should handle update command with context

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "test-123", {"context": "New context"}

    Number of calls: 0

      79 |     await ticketCommand.parseAsync(['node', 'test', 'update', 'test-123', '--context', 'New context']);
      80 |     
    > 81 |     expect(mockTicketManager.updateTicket).toHaveBeenCalledWith('test-123', { context: 'New context' });
         |                                            ^
      82 |     expect(logger.success).toHaveBeenCalledWith('Updated ticket: test-123');
      83 |   });
      84 |

      at Object.<anonymous> (src/commands/__tests__/ticket-basic.test.ts:81:44)

  ● Ticket Command Basic Coverage › should handle continue command with existing ticket

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "test-123"

    Number of calls: 0

       95 |     await ticketCommand.parseAsync(['node', 'test', 'continue', 'test-123']);
       96 |     
    >  97 |     expect(mockTicketManager.continueTicket).toHaveBeenCalledWith('test-123');
          |                                              ^
       98 |     expect(logger.success).toHaveBeenCalledWith('Continuing ticket: test-123');
       99 |     expect(logger.info).toHaveBeenCalledWith('Title: Test');
      100 |     expect(logger.info).toHaveBeenCalledWith('Status: in_progress');

      at Object.<anonymous> (src/commands/__tests__/ticket-basic.test.ts:97:46)

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

 FAIL  src/commands/__tests__/init-basic.test.ts
  ● Test suite failed to run

    src/lib/claudeMdGenerator.ts:58:11 - error TS6133: 'generateRouterContent' is declared but its value is never read.

    58   private generateRouterContent(): string {
                 ~~~~~~~~~~~~~~~~~~~~~

 FAIL  src/commands/__tests__/config-basic.test.ts
  ● Config Command Basic › should handle basic get operations

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "someKey"

    Number of calls: 0

      49 |     await configCommand.parseAsync(['node', 'test', 'someKey']);
      50 |     
    > 51 |     expect(mockConfigManager.get).toHaveBeenCalledWith('someKey');
         |                                   ^
      52 |     expect(logger.info).toHaveBeenCalledWith('someKey: test-value');
      53 |   });
      54 |

      at Object.<anonymous> (src/commands/__tests__/config-basic.test.ts:51:35)

  ● Config Command Basic › should handle basic set operations

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "someKey", "someValue"

    Number of calls: 0

      56 |     await configCommand.parseAsync(['node', 'test', 'someKey', 'someValue']);
      57 |     
    > 58 |     expect(mockConfigManager.set).toHaveBeenCalledWith('someKey', 'someValue');
         |                                   ^
      59 |     expect(mockConfigManager.save).toHaveBeenCalled();
      60 |     expect(logger.success).toHaveBeenCalledWith('Configuration updated: someKey = someValue');
      61 |   });

      at Object.<anonymous> (src/commands/__tests__/config-basic.test.ts:58:35)

 FAIL  src/lib/__tests__/componentInstaller-coverage.test.ts
  ● Test suite failed to run

    src/lib/__tests__/componentInstaller-coverage.test.ts:1:1 - error TS6133: 'fs' is declared but its value is never read.

    1 import * as fs from 'fs/promises';
      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    src/lib/__tests__/componentInstaller-coverage.test.ts:5:1 - error TS6133: 'logger' is declared but its value is never read.

    5 import { logger } from '../logger';
      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    src/lib/__tests__/componentInstaller-coverage.test.ts:26:43 - error TS2345: Argument of type '{ filename: string; }' is not assignable to parameter of type 'Module'.
      Type '{ filename: string; }' is missing the following properties from type 'Module': children, exports, id, isPreloading, and 5 more.

    26     jest.replaceProperty(require, 'main', { filename: '/test/cli.js' });
                                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

 FAIL  src/lib/__tests__/updateManager-basic.test.ts
  ● Test suite failed to run

    src/lib/__tests__/updateManager-basic.test.ts:1:1 - error TS6133: 'fs' is declared but its value is never read.

    1 import * as fs from 'fs/promises';
      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    src/lib/__tests__/updateManager-basic.test.ts:23:43 - error TS2345: Argument of type '{ filename: string; }' is not assignable to parameter of type 'Module'.
      Type '{ filename: string; }' is missing the following properties from type 'Module': children, exports, id, isPreloading, and 5 more.

    23     jest.replaceProperty(require, 'main', { filename: '/test/cli.js' });
                                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

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

 FAIL  src/lib/__tests__/componentInstaller-basic.test.ts
  ● Test suite failed to run

    src/lib/__tests__/componentInstaller-basic.test.ts:22:43 - error TS2345: Argument of type '{ filename: string; }' is not assignable to parameter of type 'Module'.
      Type '{ filename: string; }' is missing the following properties from type 'Module': children, exports, id, isPreloading, and 5 more.

    22     jest.replaceProperty(require, 'main', { filename: '/test/cli.js' });
                                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

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

 FAIL  src/lib/__tests__/languageOverrideManager-basic.test.ts
  ● Test suite failed to run

    src/lib/__tests__/languageOverrideManager-basic.test.ts:22:43 - error TS2345: Argument of type '{ filename: string; }' is not assignable to parameter of type 'Module'.
      Type '{ filename: string; }' is missing the following properties from type 'Module': children, exports, id, isPreloading, and 5 more.

    22     jest.replaceProperty(require, 'main', { filename: '/test/cli.js' });
                                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~


Test Suites: 24 failed, 6 passed, 30 total
Tests:       48 failed, 73 passed, 121 total
Snapshots:   0 total
Time:        4.986 s
Ran all test suites.
```