#![allow(non_camel_case_types, non_snake_case)]
use serde::{Deserialize, Serialize};

#[derive(Deserialize, Debug)]
pub struct PlayerDataInput {
    pub passcode: String,
    pub user_addr: String,
    pub uid: usize,
}

#[derive(Serialize, Clone)]
pub struct PlayerData {
    pub user_addr: String,
    pub uid: usize,
}

#[derive(Serialize)]
pub struct JoinResponse {
    pub user_addr: String,
    pub uid: usize,
    pub content: String,
    pub status: JoinStatus,
}

#[derive(Serialize)]
pub enum JoinStatus {
    ADDED,
    WRONG_PASSCODE,
    FOUND,
    QUEUE_FULL,
}

#[derive(Serialize, Clone)]
pub struct JoinInstruction {
    pub uid: usize,
    pub playerOne: Option<String>,
    pub playerTwo: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum VideoId {
    shoot_opp_opp_die,
    shoot_opp_self_die,
    shoot_opp_opp_click,
    shoot_opp_self_click,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum QueueStatus {
    FOUND,
    READY,
}

#[derive(Serialize)]
pub struct ShootResponse {
    pub shooter: String,
    pub target: String,
    pub videoId: VideoId,
}

#[derive(Serialize)]
pub struct QueueResponse {
    pub sender_address: String,
    pub status: QueueStatus,
    pub content: String,
}

#[derive(Deserialize)]
#[serde(tag = "action")]
pub enum Action {
    GeneralMessage {
        sender_address: String,
        content: String,
        passcode: String,
    },
    ShootInstruction {
        shooter_address: String,
        target_address: String,
        video_id: VideoId,
        passcode: String,
    },
    QueueUpdate {
        sender_address: String,
        status: QueueStatus,
        content: String,
        passcode: String,
    },
}
