import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Roullete } from "../target/types/roullete";
import { assert, expect } from "chai";

import {
  getBalances,
  activateAccount,
  convertLamportToSol,
  shoot_s,
  getEvent,
} from "./utils";

//!IMPORTANT: equal, equals and eq is same which are strict equality (===)
// whereas eql and eqls are same meaning deep equality ( for objects and arrays )

describe("ROULETTE", async () => {
  let program: Program<Roullete>;
  let gameKeypair: anchor.web3.PublicKey;
  // let playerOne: Wallet;
  let playerOne: anchor.web3.Keypair;
  let playerTwo: anchor.web3.Keypair;
  let uncheckedAccPubkey: anchor.web3.PublicKey;
  anchor.setProvider(anchor.AnchorProvider.env());

  const uid = new anchor.BN(1);

  before(async () => {
    //setting accounts
    program = anchor.workspace.Roullete as Program<Roullete>;
    // playerOne = (program.provider as anchor.AnchorProvider).wallet;
    playerOne = anchor.web3.Keypair.generate();
    uncheckedAccPubkey = anchor.web3.SYSVAR_SLOT_HASHES_PUBKEY;
    playerTwo = anchor.web3.Keypair.generate();
    [gameKeypair] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("session"),
        playerOne.publicKey.toBuffer(),
        playerTwo.publicKey.toBuffer(),
        new anchor.BN(1).toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    // activating accounts
    await activateAccount(anchor.AnchorProvider.env(), playerTwo.publicKey);
    await activateAccount(anchor.AnchorProvider.env(), playerOne.publicKey);
  });

  describe("INITIATION TESTS", () => {
    beforeEach(
      async () =>
        await getBalances(
          "initial",
          program.provider.connection,
          gameKeypair,
          playerOne.publicKey,
          playerTwo.publicKey,
          uncheckedAccPubkey
        )
    );

    afterEach(
      async () =>
        await getBalances(
          "final",
          program.provider.connection,
          gameKeypair,
          playerOne.publicKey,
          playerTwo.publicKey,
          uncheckedAccPubkey
        )
    );
    it("Players added", async () => {
      await program.methods
        .joinSession(uid, playerOne.publicKey, playerTwo.publicKey)
        .accounts({
          playerOne: playerOne.publicKey,
          playerTwo: playerTwo.publicKey,
        })
        .signers([playerOne])
        .rpc()
        .catch((err) => console.log("hehee", err));

      await program.methods
        .transferBet(uid)
        .accounts({
          player: playerOne.publicKey,
          playerOne: playerOne.publicKey,
          playerTwo: playerTwo.publicKey,
        })
        .signers([playerOne])
        .rpc()
        .catch((err) => console.log(err));
      await program.methods
        .transferBet(uid)
        .accounts({
          player: playerTwo.publicKey,
          playerOne: playerOne.publicKey,
          playerTwo: playerTwo.publicKey,
        })
        .signers([playerTwo])
        .rpc();

      let session = await program.account.session.fetch(gameKeypair);

      expect(session.playerOne).is.eql(
        playerOne.publicKey,
        "Player One mismatch"
      );

      expect(session.playerTwo).is.eql(
        playerTwo.publicKey,
        "Player One mismatch"
      );
    });

    it("session started", async () => {
      const session = await program.account.session.fetch(gameKeypair);
      expect(session.turn).is.equal(false, "turn is not correct");
      expect(session.state).is.eql({ active: {} }, "game is not active");

      expect(session.trigger).is.equals(0, "trigger is not set");
    });
  });

  describe("GAME TESTS", () => {
    let load: boolean[];
    let over: boolean;
    let player_one_turn: boolean;

    before("setting load and all", async () => {
      load = (await program.account.session.fetch(gameKeypair)).load;
      over =
        JSON.stringify(
          (await program.account.session.fetch(gameKeypair)).state
        ) !== JSON.stringify({ active: {} });
    });
    beforeEach(
      async () =>
        await getBalances(
          "initial",
          program.provider.connection,
          gameKeypair,
          playerOne.publicKey,
          playerTwo.publicKey,
          uncheckedAccPubkey
        )
    );

    afterEach(
      async () =>
        await getBalances(
          "final",
          program.provider.connection,
          gameKeypair,
          playerOne.publicKey,
          playerTwo.publicKey,
          uncheckedAccPubkey
        )
    );
    it("Turn Increases", async () => {
      console.log("Session Load : ", load);
      if (load[0]) {
        let old_balance = convertLamportToSol(
          await program.provider.connection.getBalance(playerOne.publicKey)
        );
        let event = await getEvent(program, "mementoMori", async () => {
          await shoot_s(
            program,
            playerOne.publicKey,
            playerOne.publicKey,
            playerTwo.publicKey,
            playerTwo.publicKey,
            [playerOne],
            uid
          );
        });

        let new_balance = convertLamportToSol(
          await program.provider.connection.getBalance(playerOne.publicKey)
        );

        over = true;
        expect((await program.account.session.fetch(gameKeypair)).turn).is.eq(
          false,
          "Turn not updated "
        );
        expect((await program.account.session.fetch(gameKeypair)).state).is.eql(
          { won: { winner: playerOne.publicKey } },
          "Player 1 didnt win"
        );

        assert(
          new_balance - old_balance == 0.020000000000000018 ||
            new_balance - old_balance == 0.019999999999999907,
          "Prize didn't get transferred"
        );
      } else {
        await shoot_s(
          program,
          playerOne.publicKey,
          playerOne.publicKey,
          playerTwo.publicKey,
          playerTwo.publicKey,
          [playerOne],
          uid
        );
        expect(
          (await program.account.session.fetch(gameKeypair)).turn
        ).is.equal(true, "turn not updated");
        expect(
          (await program.account.session.fetch(gameKeypair)).trigger
        ).is.equals(1, "trigger not updated");
      }
    });

    it("Player two wins !! (player one if load is on first)", async () => {
      if (!over) {
        player_one_turn = !(await program.account.session.fetch(gameKeypair))
          .turn;
        for (let i = 1; i < load.length; i++) {
          if (load[i]) {
            let old_balance = convertLamportToSol(
              await program.provider.connection.getBalance(playerTwo.publicKey)
            );
            if (player_one_turn) {
              let event = await getEvent(program, "mementoMori", async () => {
                await shoot_s(
                  program,
                  playerOne.publicKey,
                  playerOne.publicKey,
                  playerTwo.publicKey,
                  playerOne.publicKey,
                  [playerOne],
                  uid
                );
              });

              expect(event.shooter).is.eql(
                playerOne.publicKey,
                "Wrong shooter"
              );
              expect(event.target).is.eql(playerOne.publicKey, "Wrong target");
              expect(event.winner).is.eql(playerTwo.publicKey, "Wrong winner");
            } else {
              let event = await getEvent(program, "mementoMori", async () => {
                await shoot_s(
                  program,
                  playerTwo.publicKey,
                  playerOne.publicKey,
                  playerTwo.publicKey,
                  playerOne.publicKey,
                  [playerTwo],
                  uid
                );
              });
              expect(event.shooter).is.eql(
                playerTwo.publicKey,
                "Wrong shooter"
              );
              expect(event.target).is.eql(playerOne.publicKey, "Wrong target");
              expect(event.winner).is.eql(playerTwo.publicKey, "Wrong winner");
            }
            let new_balance = convertLamportToSol(
              await program.provider.connection.getBalance(playerTwo.publicKey)
            );
            assert(
              new_balance - old_balance == 0.020000000000000018 ||
                new_balance - old_balance == 0.019999999999999907,
              "Prize didn't get transferred"
            );

            break;
          } else {
            if (player_one_turn) {
              await shoot_s(
                program,
                playerOne.publicKey,
                playerOne.publicKey,
                playerTwo.publicKey,
                playerTwo.publicKey,
                [playerOne],
                uid
              );
            } else {
              await shoot_s(
                program,
                playerTwo.publicKey,
                playerOne.publicKey,
                playerTwo.publicKey,
                playerOne.publicKey,
                [playerTwo],
                uid
              );
            }
          }
          player_one_turn = !player_one_turn;
        }

        expect(
          (await program.account.session.fetch(gameKeypair)).state
        ).is.eqls(
          { won: { winner: playerTwo.publicKey } }, // IMPORTANT :  small w in Won
          "Player two didn't win"
        );
      } else {
        expect(
          (await program.account.session.fetch(gameKeypair)).state
        ).is.eqls(
          { won: { winner: playerOne.publicKey } }, // IMPORTANT :  small w in Won
          "Player one didn't win"
        );
      }

      console.log(
        "record: ",
        (await program.account.session.fetch(gameKeypair)).record
      );
    });

    it("Session already started error", async () => {
      try {
        await program.methods
          .joinSession(uid, playerOne.publicKey, playerTwo.publicKey)
          .accounts({
            playerOne: playerOne.publicKey,
            playerTwo: playerTwo.publicKey,
          })
          .signers([playerOne])
          .rpc();
      } catch (err) {
        expect(err).to.be.instanceOf(anchor.AnchorError);
        expect(err.error.errorCode.code).to.equal("SessionAlreadyStarted");
        expect(err.error.errorCode.number).to.equal(6001);
        expect(err.error.errorMessage).to.equal("Session has started");
        expect(err.program.equals(program.programId)).is.true;
      }
    });

    it("Testing session over error", async () => {
      try {
        await program.methods
          .shoot(uid, playerTwo.publicKey)
          .accounts({
            shooter: player_one_turn
              ? playerOne.publicKey
              : playerTwo.publicKey,
            playerOne: playerOne.publicKey,
            playerTwo: playerTwo.publicKey,
          })
          .signers(player_one_turn ? [playerOne] : [playerTwo])
          .rpc();
      } catch (err) {
        expect(err).to.be.instanceOf(anchor.AnchorError);
        expect(err.error.errorCode.code).to.equal("SessionAlreadyOver");
        expect(err.error.errorCode.number).to.equal(6000);
        expect(err.error.errorMessage).to.equal("Session is over");
        expect(err.program.equals(program.programId)).is.true;
      }
    });

    it("New session, wrong turn and error on multiple call of join_session", async () => {
      let p1 = playerOne;
      let p2 = playerTwo;
      // await activateAccount(anchor.AnchorProvider.env(), p1.publicKey);
      // await activateAccount(anchor.AnchorProvider.env(), p2.publicKey);
      let [ng] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("session"),
          p1.publicKey.toBuffer(),
          p2.publicKey.toBuffer(),
          new anchor.BN(2).toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );
      await program.methods
        .joinSession(new anchor.BN(2), p1.publicKey, p2.publicKey)
        .accounts({ playerOne: p1.publicKey, playerTwo: p2.publicKey })
        .signers([p1])
        .rpc()
        .catch((err) => {
          console.log(err);
        });

      await program.methods
        .transferBet(new anchor.BN(2))
        .accounts({
          player: p1.publicKey,
          playerOne: p1.publicKey,
          playerTwo: p2.publicKey,
        })
        .signers([p1])
        .rpc()
        .catch((e) => console.log(e));
      await program.methods
        .transferBet(new anchor.BN(2))
        .accounts({
          player: p2.publicKey,
          playerOne: p1.publicKey,
          playerTwo: p2.publicKey,
        })
        .signers([p2])
        .rpc()
        .catch((e) => console.log(e));

      let session = await program.account.session.fetch(ng);
      console.log("Session 2 load: ", session.load);

      expect(session.playerOne).is.eql(
        playerOne.publicKey,
        "Player One mismatch"
      );

      expect(session.playerTwo).is.eql(
        playerTwo.publicKey,
        "Player One mismatch"
      );

      expect(session.turn).is.equal(false, "turn is not correct");
      expect(session.state).is.eql({ active: {} }, "game is not active");

      expect(session.trigger).is.equals(0, "trigger is not set");

      try {
        await program.methods
          .shoot(new anchor.BN(2), p2.publicKey)
          .accounts({
            shooter: p2.publicKey,
            playerOne: p1.publicKey,
            playerTwo: p2.publicKey,
          })
          .signers([p2])
          .rpc();
      } catch (err) {
        expect(err).to.be.instanceOf(anchor.AnchorError);
        expect(err.error.errorCode.code).to.equal("NotYourTurn");
        expect(err.error.errorCode.number).to.equal(6002);
        expect(err.error.errorMessage).to.equal("It is not your turn");
        expect(err.program.equals(program.programId)).is.true;
      }

      session = await program.account.session.fetch(ng);
      await shoot_s(
        program,
        p1.publicKey,
        p1.publicKey,
        p2.publicKey,
        p2.publicKey,
        [p1],
        new anchor.BN(2)
      );
      expect((await program.account.session.fetch(ng)).turn).is.equal(
        !(await program.account.session.fetch(ng)).load[0],
        "turn not updated"
      );
      expect((await program.account.session.fetch(ng)).trigger).is.equals(
        1,
        "trigger not updated"
      );
    });
  });
});

// OTHER WAY TO SEND TRANSACTIONS
// const tx = await program.methods
//   .joinSession()
//   .accounts({
//     player: playerTwo.publicKey,
//   })
//   .transaction();

// const latestBlockhash =
//   await program.provider.connection.getLatestBlockhash();
// tx.recentBlockhash = latestBlockhash.blockhash;
// tx.feePayer = playerTwo.publicKey;

// tx.sign(playerTwo);

// const rawTransaction = tx.serialize();
// const txId = await program.provider.connection.sendRawTransaction(
//   rawTransaction,
//   {
//     skipPreflight: false,
//     preflightCommitment: "confirmed",
//   }
// );
// await program.provider.connection.confirmTransaction(txId);
