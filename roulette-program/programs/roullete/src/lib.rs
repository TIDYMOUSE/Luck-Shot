use crate::session::*;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::native_token::LAMPORTS_PER_SOL;
use anchor_lang::system_program;
use arrayref::array_ref;
use errors::RoulleteErrors;
use solana_program::sysvar;

pub mod errors;
pub mod events;
pub mod session;

declare_id!("C4CFz2gwxM2MUrLTgyzySfM3MTwCauFtKmStfhpZqYTD");

#[program]
pub mod roullete {

    use super::*;

    pub fn join_session(
        ctx: Context<JoinSession>,
        _uid: u64,
        player_one: Pubkey,
        player_two: Pubkey,
    ) -> Result<()> {
        let data = &ctx.accounts.recent_slothashes.data.borrow();
        ctx.accounts
            .session
            .start_session(player_one, player_two, array_ref![data, 12, 8])?;

        Ok(())
    }

    pub fn transfer_bet(ctx: Context<TransferBet>, _uid: u64) -> Result<()> {
        // ! This doenst work, as user wallet is not owned  by system program so you cannot deduct, you can only deduct from pda
        // ctx.accounts.player.sub_lamports(LAMPORTS_PER_SOL / 100)?; // 0.01 sol as bet money
        // ctx.accounts.session.add_lamports(LAMPORTS_PER_SOL / 100)?;

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.player.to_account_info(),
                    to: ctx.accounts.session.to_account_info(),
                },
            ),
            LAMPORTS_PER_SOL / 100,
        )?;

        Ok(())
    }

    pub fn shoot(ctx: Context<Shoot>, _uid: u64, target: Pubkey) -> Result<()> {
        let shooter = ctx.accounts.shooter.key();
        let code = if shooter == ctx.accounts.player_one.key() {
            if shooter == target {
                11
            } else {
                12
            }
        } else {
            if shooter == target {
                22
            } else {
                21
            }
        };
        ctx.accounts.session.shoot(shooter, target, code)?;
        if !ctx.accounts.session.is_active() {
            match ctx.accounts.session.get_state() {
                State::Active | State::Inactive => {
                    return Err(RoulleteErrors::InternalGameError.into());
                }
                State::Won { winner } => {
                    if winner == *ctx.accounts.player_one.key {
                        ctx.accounts.session.sub_lamports(LAMPORTS_PER_SOL / 50)?;
                        ctx.accounts
                            .player_one
                            .add_lamports(LAMPORTS_PER_SOL / 50)?;
                    } else if winner == ctx.accounts.player_two.key() {
                        ctx.accounts.session.sub_lamports(LAMPORTS_PER_SOL / 50)?;
                        ctx.accounts
                            .player_two
                            .add_lamports(LAMPORTS_PER_SOL / 50)?;
                    } else {
                        return Err(RoulleteErrors::InternalGameError.into());
                    }
                }
            }
        }
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(uid: u64)]
pub struct JoinSession<'info> {
    #[account(
        init_if_needed,
        payer=player_one,
        seeds=[ b"session", player_one.key().as_ref(), player_two.key().as_ref(), uid.to_le_bytes().as_ref()],
        bump,
        space=Session::MAX_SIZE + 8
    )]
    pub session: Account<'info, Session>,
    #[account(mut)]
    pub player_one: Signer<'info>,
    /// CHECK: account constraints checked in account trait
    pub player_two: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
    /// CHECK: Used only for random number generation
    #[account(address = sysvar::slot_hashes::id())]
    recent_slothashes: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(uid: u64)]
pub struct TransferBet<'info> {
    #[account(
        mut,
        seeds=[ b"session", player_one.key().as_ref(), player_two.key().as_ref(), uid.to_le_bytes().as_ref()],
        bump,
    )]
    pub session: Account<'info, Session>,
    #[account(mut)]
    pub player: Signer<'info>,
    /// CHECK: account constraints checked in account trait
    pub player_one: AccountInfo<'info>,
    /// CHECK: account constraints checked in account trait
    pub player_two: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(uid: u64)]
pub struct Shoot<'info> {
    #[account(
        mut,
        seeds=[ b"session", player_one.key().as_ref(), player_two.key().as_ref(), uid.to_le_bytes().as_ref()],
        bump
    )]
    pub session: Account<'info, Session>,
    #[account(signer)]
    pub shooter: Signer<'info>,
    #[account(mut)]
    /// CHECK: account constraints checked in account trait
    pub player_one: AccountInfo<'info>,
    #[account(mut)]
    /// CHECK: account constraints checked in account trait
    pub player_two: AccountInfo<'info>,
}
