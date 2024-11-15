export enum VideoId {
  ShootOppOppDie = "shoot_opp_opp_die",
  ShootOppSelfDie = "shoot_opp_self_die",
  ShootOppOppClick = "shoot_opp_opp_click",
  ShootOppSelfClick = "shoot_opp_self_click",
}

export interface Action {
  action: "GeneralMessage" | "ShootInstruction" | "QueueUpdate";
  sender_address?: string;
  content?: string;
  shooter_address?: string;
  target_address?: string;
  video_id?: VideoId;
  status?: "FOUND" | "READY";
  passcode: String;
}
export interface ShootResponse {
  shooter: string;
  target: string;
  videoId: VideoId;
}
export interface QueueResponse {
  sender_address: string;
  content: string;
  status: "FOUND" | "READY";
}

export interface JoinResponse {
  user_addr: string;
  uid: number;
  content: string;
  status: "ADDED" | "WRONG_PASSCODE" | "FOUND" | "QUEUE_FULL";
}

export interface JoinInstruction {
  uid: number;
  playerOne: string | null;
  playerTwo: string | null;
}
