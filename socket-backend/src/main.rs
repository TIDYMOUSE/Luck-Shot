use actix_cors::Cors;
use actix_web::error::{ErrorConflict, ErrorNotFound};
use actix_web::{
    get, middleware, post, rt, web, App, Error, HttpRequest, HttpResponse, HttpServer, Responder,
};
use dotenvy::dotenv;
use rand::rngs::OsRng;
use reqres::{JoinResponse, JoinStatus, QueueResponse};
use rsa::pkcs8::LineEnding;
use rsa::{pkcs1::EncodeRsaPrivateKey, pkcs8::EncodePublicKey, RsaPrivateKey, RsaPublicKey};
use serde_json::json;
use tokio::sync::Mutex;

use std::collections::HashMap;
use std::collections::VecDeque;
use std::env;
use std::sync::Arc;

mod reqres;
mod socket;

use self::reqres::{JoinInstruction, PlayerData, PlayerDataInput};
use self::socket::GameSession;

#[get("/")]
async fn home() -> impl Responder {
    HttpResponse::Ok().body("Hello world")
}

#[post("/join")]
async fn find_match(
    req: web::Json<PlayerDataInput>,
    queue: web::Data<Mutex<VecDeque<PlayerData>>>,
    map: web::Data<Mutex<HashMap<usize, Arc<Mutex<GameSession>>>>>,
) -> Result<HttpResponse, Error> {
    let mut q = queue.lock().await;
    let player_input = req.into_inner();
    println!("{:?}", player_input);
    if q.len() > 5 {
        return Ok(HttpResponse::Conflict().json(JoinResponse {
            user_addr: player_input.user_addr.clone(),
            uid: player_input.uid,
            content: "Queue is full please try again later, size".to_string(),
            status: JoinStatus::QUEUE_FULL,
        }));
    }

    let passcode = env::var("PASSCODE").unwrap_or_else(|_| "".to_owned());
    if player_input.passcode != passcode {
        return Ok(HttpResponse::Forbidden().json(JoinResponse {
            user_addr: player_input.user_addr.clone(),
            uid: player_input.uid,
            content: "Wrong passcode".to_string(),
            status: JoinStatus::WRONG_PASSCODE,
        }));
    }

    let p2: Option<PlayerData> = q.pop_front();

    match p2 {
        Some(player) => {
            println!(
                "Match Found {}",
                player.user_addr.get(0..5).unwrap_or(&player.user_addr)
            );

            let join_instruction = JoinInstruction {
                playerOne: Some(player.user_addr),
                playerTwo: Some(player_input.user_addr.clone()),
                uid: player.uid,
            };

            match map.lock().await.get_mut(&player.uid) {
                Some(g_session) => {
                    g_session.lock().await.join_instruction.playerTwo =
                        Some(player_input.user_addr.clone());
                }
                None => {
                    return Err(ErrorNotFound(format!(
                        "Game session not found for UID: {}",
                        player_input.uid,
                    )));
                }
            }

            Ok(HttpResponse::Ok().json(JoinResponse {
                user_addr: player_input.user_addr.clone(),
                uid: player_input.uid,
                content: serde_json::to_string(&join_instruction).unwrap(),
                status: JoinStatus::FOUND,
            }))
        }
        None => {
            q.push_back(PlayerData {
                user_addr: player_input.user_addr.clone(),
                uid: player_input.uid,
            });
            let join_instruction = JoinInstruction {
                playerOne: Some(player_input.user_addr.clone()),
                // playerTwo: player_input.user_addr,
                playerTwo: None,
                uid: player_input.uid,
            };

            map.lock().await.insert(
                player_input.uid,
                Arc::new(Mutex::new(GameSession::new(join_instruction.clone()))),
            );
            Ok(HttpResponse::Ok().json(JoinResponse {
                user_addr: player_input.user_addr.clone(),
                uid: player_input.uid,
                content: serde_json::to_string(&join_instruction).unwrap(),
                status: JoinStatus::ADDED,
            }))
        }
    }
}

#[get("/start/{addr}/{uid}")]
async fn start_session(
    req: HttpRequest,
    stream: web::Payload,
    map: web::Data<Mutex<HashMap<usize, Arc<Mutex<GameSession>>>>>,
    path: web::Path<(String, usize)>,
) -> Result<HttpResponse, Error> {
    let (res, session, stream) = actix_ws::handle(&req, stream)?;
    let (addr, uid) = path.into_inner();
    println!("{}", addr);
    /*
    ! CRAZY CRITICAL CODE :
    * 1. player one waits in queue
    * 2. player two finds a match and sends player one a response of FOUND and still is on waiting screen
    * 3. player one signs join session transaction (TODO: partial signing)
    * 4. After succesfull signing player one disconnects, connects again on game screen and sends READY message to socket two
    * 5. After getting the message, socket of player two disconnects and connects again on game screen (optional sending READY message as it doesnt do anything)
    */
    match map.lock().await.get_mut(&uid) {
        Some(g_session) => {
            if addr
                == *g_session
                    .lock()
                    .await
                    .join_instruction
                    .playerOne
                    .as_ref()
                    .unwrap()
            {
                *g_session.lock().await.player_one_session.lock().await = Some(session.clone());
            } else if g_session.lock().await.join_instruction.playerTwo.is_some()
                && addr
                    == *g_session
                        .lock()
                        .await
                        .join_instruction
                        .playerTwo
                        .as_ref()
                        .unwrap()
            {
                *g_session.lock().await.player_two_session.lock().await = Some(session.clone());
                if let Err(e) = g_session
                    .lock()
                    .await
                    .broadcast(
                        &addr,
                        serde_json::to_string(&QueueResponse {
                            sender_address: addr.clone(),
                            content: "Player two found".to_string(),
                            status: reqres::QueueStatus::FOUND,
                        })
                        .unwrap(),
                    )
                    .await
                {
                    return Err(ErrorConflict(format!(
                        "player two failded to send ready message, player two: {}, {}",
                        addr,
                        e.to_string()
                    )));
                }
            } else {
                return Err(ErrorNotFound(format!("Invalid address, {}", addr)));
            }
        }
        None => {
            return Err(ErrorNotFound(format!(
                "Game session not found for UID: {}",
                uid
            )))
        }
    };

    let g_session = Arc::new(map.lock().await.get_mut(&uid).unwrap().lock().await.clone());
    rt::spawn(async move {
        g_session.handle_socket(session, stream).await;
    });
    Ok(res)
}

#[get("/data")]
async fn get_data(
    map: web::Data<Mutex<HashMap<usize, Arc<Mutex<GameSession>>>>>,
    vec: web::Data<Mutex<VecDeque<PlayerData>>>,
) -> impl Responder {
    let map_lock = map.lock().await;
    let queue_lock = vec.lock().await;

    let mut map_contents = Vec::new();
    for (k, v) in map_lock.iter() {
        let game_session = v.lock().await;
        map_contents.push((*k, game_session.join_instruction.clone()));
    }

    let queue_contents: Vec<PlayerData> = queue_lock.iter().cloned().collect();

    let response = json!({
        "ongoing_matches": map_contents,
        "waiting_queue": queue_contents,
    });

    HttpResponse::Ok().json(response)
}

#[get("/key")]
async fn generate_keys() -> impl Responder {
    let mut rng = OsRng;
    let bits = 2048;
    let private_key = RsaPrivateKey::new(&mut rng, bits).expect("Failed to generate a key");
    let public_key = RsaPublicKey::from(&private_key);

    let private_pem = private_key.to_pkcs1_pem(LineEnding::LF).unwrap();
    let public_pem = public_key.to_public_key_pem(LineEnding::LF).unwrap();

    // let pem = private_key.to_pkcs1_pem(LineEnding::LF)?;
    // let base64_encoded = encode(pem);

    // // Set the encoded private key in the environment
    // env::set_var("PRIVATE_KEY_BASE64", base64_encoded);

    HttpResponse::Ok().body(format!(
        "Private: {}, public: {}",
        private_pem.to_string(),
        public_pem
    ))
}

#[get("/remove/{uid}")]
async fn remove_from_map(
    vec: web::Data<Mutex<VecDeque<PlayerData>>>,
    map: web::Data<Mutex<HashMap<usize, Arc<Mutex<GameSession>>>>>,
    path: web::Path<usize>,
) -> impl Responder {
    let uid = path.into_inner();
    vec.lock().await.remove(uid);
    map.lock().await.remove(&uid);
    return HttpResponse::Ok();
}

// TODO: find in queue

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    let waiting_queue: web::Data<Mutex<VecDeque<PlayerData>>> =
        web::Data::new(Mutex::new(VecDeque::new()));

    let map: web::Data<Mutex<HashMap<usize, Arc<Mutex<GameSession>>>>> =
        web::Data::new(Mutex::new(HashMap::new()));
    HttpServer::new(move || {
        App::new()
            .app_data(waiting_queue.clone())
            .app_data(map.clone())
            // .app_data(counter.clone())
            .service(home)
            .service(find_match)
            .service(get_data)
            .service(generate_keys)
            .service(start_session)
            .wrap(middleware::NormalizePath::trim())
            .wrap(middleware::Logger::default())
            .wrap(
                Cors::default()
                    .allow_any_origin()
                    .allow_any_header()
                    .allow_any_method()
                    .supports_credentials()
                    .max_age(3600),
            )
    })
    .bind((
        env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),
        env::var("PORT")
            .unwrap_or_else(|_| "8080".to_string())
            .parse::<u16>()
            .expect("PORT must be a valid number"),
    ))?
    .run()
    .await
}
