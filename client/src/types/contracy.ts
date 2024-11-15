/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/roullete.json`.
 */
export type Roullete = {
  address: "C4CFz2gwxM2MUrLTgyzySfM3MTwCauFtKmStfhpZqYTD";
  metadata: {
    name: "roullete";
    version: "0.1.0";
    spec: "0.1.0";
    description: "Created with Anchor";
  };
  instructions: [
    {
      name: "joinSession";
      discriminator: [23, 92, 4, 160, 155, 56, 164, 253];
      accounts: [
        {
          name: "session";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [115, 101, 115, 115, 105, 111, 110];
              },
              {
                kind: "account";
                path: "playerOne";
              },
              {
                kind: "account";
                path: "playerTwo";
              },
              {
                kind: "arg";
                path: "uid";
              }
            ];
          };
        },
        {
          name: "playerOne";
          writable: true;
          signer: true;
        },
        {
          name: "playerTwo";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
        {
          name: "recentSlothashes";
          address: "SysvarS1otHashes111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "uid";
          type: "u64";
        },
        {
          name: "playerOne";
          type: "pubkey";
        },
        {
          name: "playerTwo";
          type: "pubkey";
        }
      ];
    },
    {
      name: "shoot";
      discriminator: [41, 43, 22, 19, 8, 30, 7, 103];
      accounts: [
        {
          name: "session";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [115, 101, 115, 115, 105, 111, 110];
              },
              {
                kind: "account";
                path: "playerOne";
              },
              {
                kind: "account";
                path: "playerTwo";
              },
              {
                kind: "arg";
                path: "uid";
              }
            ];
          };
        },
        {
          name: "shooter";
          signer: true;
        },
        {
          name: "playerOne";
          writable: true;
        },
        {
          name: "playerTwo";
          writable: true;
        }
      ];
      args: [
        {
          name: "uid";
          type: "u64";
        },
        {
          name: "target";
          type: "pubkey";
        }
      ];
    },
    {
      name: "transferBet";
      discriminator: [61, 83, 8, 3, 100, 209, 178, 95];
      accounts: [
        {
          name: "session";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [115, 101, 115, 115, 105, 111, 110];
              },
              {
                kind: "account";
                path: "playerOne";
              },
              {
                kind: "account";
                path: "playerTwo";
              },
              {
                kind: "arg";
                path: "uid";
              }
            ];
          };
        },
        {
          name: "player";
          writable: true;
          signer: true;
        },
        {
          name: "playerOne";
        },
        {
          name: "playerTwo";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "uid";
          type: "u64";
        }
      ];
    }
  ];
  accounts: [
    {
      name: "session";
      discriminator: [243, 81, 72, 115, 214, 188, 72, 144];
    }
  ];
  events: [
    {
      name: "mementoMori";
      discriminator: [119, 151, 207, 175, 37, 122, 13, 239];
    }
  ];
  errors: [
    {
      code: 6000;
      name: "sessionAlreadyOver";
      msg: "Session is over";
    },
    {
      code: 6001;
      name: "sessionAlreadyStarted";
      msg: "Session has started";
    },
    {
      code: 6002;
      name: "notYourTurn";
      msg: "It is not your turn";
    },
    {
      code: 6003;
      name: "triggerOutOfBounds";
      msg: "Trigger exceeded out of bounds";
    },
    {
      code: 6004;
      name: "internalGameError";
      msg: "Some logic error!";
    }
  ];
  types: [
    {
      name: "mementoMori";
      type: {
        kind: "struct";
        fields: [
          {
            name: "shooter";
            type: "pubkey";
          },
          {
            name: "target";
            type: "pubkey";
          },
          {
            name: "winner";
            type: "pubkey";
          }
        ];
      };
    },
    {
      name: "session";
      type: {
        kind: "struct";
        fields: [
          {
            name: "playerOne";
            type: "pubkey";
          },
          {
            name: "playerTwo";
            type: "pubkey";
          },
          {
            name: "turn";
            type: "bool";
          },
          {
            name: "load";
            type: {
              array: ["bool", 6];
            };
          },
          {
            name: "trigger";
            type: "u8";
          },
          {
            name: "state";
            type: {
              defined: {
                name: "state";
              };
            };
          },
          {
            name: "record";
            type: {
              array: ["u8", 6];
            };
          }
        ];
      };
    },
    {
      name: "state";
      type: {
        kind: "enum";
        variants: [
          {
            name: "inactive";
          },
          {
            name: "active";
          },
          {
            name: "won";
            fields: [
              {
                name: "winner";
                type: "pubkey";
              }
            ];
          }
        ];
      };
    }
  ];
};
