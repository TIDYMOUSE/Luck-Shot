use actix_ws::{AggregatedMessage, CloseReason, Closed};
use futures_util::StreamExt as _;
use std::env;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::Mutex;

use crate::reqres::{Action, JoinInstruction, QueueResponse, QueueStatus, ShootResponse};

const _HEARTBEAT_INTERVAL: Duration = Duration::from_secs(60);

// TODO: this
// const CLIENT_TIMEOUT: Duration = Duration::from_secs(90);

#[derive(Clone)]
pub struct GameSession {
    pub player_one_session: Arc<Mutex<Option<actix_ws::Session>>>,
    pub player_two_session: Arc<Mutex<Option<actix_ws::Session>>>,
    pub join_instruction: JoinInstruction,
}

impl GameSession {
    pub fn new(join_instruction: JoinInstruction) -> Self {
        GameSession {
            player_one_session: Arc::new(Mutex::new(None)),
            player_two_session: Arc::new(Mutex::new(None)),
            join_instruction,
        }
    }

    pub async fn handle_socket(
        self: Arc<Self>,
        mut session: actix_ws::Session,
        msg_stream: actix_ws::MessageStream,
    ) {
        let secret_passcode = env::var("PASSCODE").unwrap_or_else(|_| "".to_owned());
        let mut stream = msg_stream
            .aggregate_continuations()
            .max_continuation_size(2_usize.pow(20));

        let mut _last_beat = Instant::now();

        let reason: Option<CloseReason> = loop {
            match stream.next().await {
                Some(Ok(msg)) => match msg {
                    AggregatedMessage::Ping(bytes) => {
                        _last_beat = Instant::now();
                        session.pong(&bytes).await.unwrap();
                    }

                    AggregatedMessage::Pong(_) => {
                        _last_beat = Instant::now();
                    }

                    AggregatedMessage::Text(message) => {
                        if !self.are_players_connected().await {
                            if self.player_one_session.lock().await.is_some() {
                                if let Err(e) = self
                                    .broadcast(
                                        self.join_instruction.playerOne.as_ref().unwrap(),
                                        String::from("The other player is not ready!"),
                                    )
                                    .await
                                {
                                    break Some(CloseReason {
                                        code: actix_ws::CloseCode::Error,
                                        description: Some(e.to_string()),
                                    });
                                }
                            } else {
                                if let Err(e) = self
                                    .broadcast(
                                        self.join_instruction.playerTwo.as_ref().unwrap(),
                                        String::from("The other player is not ready!"),
                                    )
                                    .await
                                {
                                    break Some(CloseReason {
                                        code: actix_ws::CloseCode::Error,
                                        description: Some(e.to_string()),
                                    });
                                }
                            }
                        }

                        match serde_json::from_str::<Action>(&message) {
                            Ok(action) => match action {
                                Action::GeneralMessage {
                                    sender_address,
                                    content,
                                    passcode,
                                } => {
                                    if passcode != secret_passcode {
                                        break Some(CloseReason {
                                            code: actix_ws::CloseCode::Policy,
                                            description: Some(String::from("Invalid passcode!")),
                                        });
                                    }

                                    if let Err(e) = self
                                        .broadcast(
                                            &sender_address,
                                            format!(
                                                "Received message {content} from {}",
                                                sender_address.to_string()
                                            ),
                                        )
                                        .await
                                    {
                                        break Some(CloseReason {
                                            code: actix_ws::CloseCode::Error,
                                            description: Some(e.to_string()),
                                        });
                                    }
                                }
                                Action::ShootInstruction {
                                    shooter_address,
                                    target_address,
                                    video_id,
                                    passcode,
                                } => {
                                    if passcode != secret_passcode {
                                        break Some(CloseReason {
                                            code: actix_ws::CloseCode::Policy,
                                            description: Some(String::from("Invalid passcode!")),
                                        });
                                    }

                                    let shoot_response = ShootResponse {
                                        shooter: shooter_address.clone(),
                                        target: target_address,
                                        videoId: video_id,
                                    };

                                    if let Err(e) = self
                                        .broadcast(
                                            &shooter_address,
                                            serde_json::to_string(&shoot_response).unwrap(),
                                        )
                                        .await
                                    {
                                        break Some(CloseReason {
                                            code: actix_ws::CloseCode::Error,
                                            description: Some(e.to_string()),
                                        });
                                    }
                                }
                                Action::QueueUpdate {
                                    sender_address,
                                    status,
                                    content,
                                    passcode,
                                } => {
                                    if passcode != secret_passcode {
                                        break Some(CloseReason {
                                            code: actix_ws::CloseCode::Policy,
                                            description: Some(String::from("Invalid passcode!")),
                                        });
                                    }
                                    match status {
                                        QueueStatus::FOUND => {} // only player one recives this and signs transaction after this
                                        QueueStatus::READY => {
                                            println!(
                                                "{}, {}, {:?}, {}",
                                                sender_address,
                                                content,
                                                status,
                                                self.player_two_session.lock().await.is_some()
                                            );
                                            let response = QueueResponse {
                                                sender_address: sender_address.clone(),
                                                status,
                                                content,
                                            };
                                            if let Err(e) = self
                                                .broadcast(
                                                    &sender_address,
                                                    serde_json::to_string(&response).unwrap(),
                                                )
                                                .await
                                            {
                                                break Some(CloseReason {
                                                    code: actix_ws::CloseCode::Error,
                                                    description: Some(e.to_string()),
                                                });
                                            }
                                        }
                                    }
                                }
                            },

                            Err(e) => {
                                eprintln!("{}", e.to_string());
                            }
                        }
                    }

                    AggregatedMessage::Binary(_bin) => {
                        println!("Unexpected Binary Message");
                        session.binary(_bin).await.unwrap();
                        break Some(CloseReason {
                            code: actix_ws::CloseCode::Unsupported,
                            description: Some(String::from("Unexpected Binary Message")),
                        });
                    }

                    AggregatedMessage::Close(rsn) => break rsn,
                },

                _ => {}
            }
        };

        // TODO: Send disconnect message
        // self.broadcast(self.join_instruction.pl, "Opponent disconnected".to_string()).await;
        let _ = session.close(reason.clone()).await;
        println!(
            "{}",
            match reason {
                Some(r) => {
                    let code: u16 = r.code.into();
                    format!("code: {}, ", code)
                }
                None => "No reason".to_string(),
            }
        )
    }

    pub async fn broadcast(&self, sender_addr: &String, message: String) -> Result<(), Closed> {
        if *sender_addr == *self.join_instruction.playerOne.as_ref().unwrap() {
            if let Some(ply_two_session) = self.player_two_session.lock().await.as_mut() {
                ply_two_session.text(message).await?;
            }
        } else if *sender_addr == *self.join_instruction.playerTwo.as_ref().unwrap() {
            if let Some(ply_one_session) = self.player_one_session.lock().await.as_mut() {
                ply_one_session.text(message).await?;
            }
        } else {
            return Err(Closed);
        }
        Ok(())
    }

    async fn are_players_connected(&self) -> bool {
        let p1_connected = self.player_one_session.lock().await.is_some();
        let p2_connected = self.player_two_session.lock().await.is_some();
        p1_connected && p2_connected
    }
}
