package main

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

// status: FOUND (content -> uid), ADDED, READY
type QueueAction struct {
	SenderAddress string `json:"sender_address"`
	Status        string `json:"status"`
	Content       string `json:"content"`
}

type PlayerItem struct {
	player_address    string
	opponent_address  *string
	socket_connection *websocket.Conn
	opp_socket        *websocket.Conn
	recv_channel      chan *PlayerItem
}

var queue = make(chan *PlayerItem, 5)

// this is only for a READY message send by player one to player two
func (player *PlayerItem) readStream() {
	defer func() {
		player.socket_connection.Close()
	}()
	var uid int
	for {
		var message QueueAction
		err := player.socket_connection.ReadJSON(&message)
		fmt.Println("message received from client: ", message)
		if err != nil {
			fmt.Println("json error: ", err)
			break
		}
		uid, err = strconv.Atoi(message.Content)
		if err != nil {
			fmt.Print("uid error", err)
			break
		}
		if err := player.opp_socket.WriteJSON(&message); err != nil {
			fmt.Println("hueue", err)
		}
	}
	fmt.Printf("uid for gameaction set here <- {%v}\n", uid)
	GameMap[uid] = GameAction{
		PlayerOne:        player.player_address,
		PlayerTwo:        *player.opponent_address,
		PlayerOneChannel: make(chan map[string]interface{}),
		PlayerTwoChannel: make(chan map[string]interface{}),
	}
	fmt.Println("this is the current map: ", GameMap)
}

// receives the updated player connections
func (player *PlayerItem) writeStream() {
	defer func() {
		player.socket_connection.Close()
	}()

	for message := range player.recv_channel {
		if message == nil {
			player.socket_connection.WriteMessage(websocket.CloseMessage, []byte("That other dude just left fr fr"))
		}
		fmt.Println("recieved message: ", message)
		*player = *message
	}
}

/*
* MESSAGE FLOW:->
* Player one joins and waits in queue and gets ADDED QueueAction
* Player two joins and sends FOUND to player one with JoinInstruction i.e id in content and playerTwo address in sender_address
* Player one preserves the connection on the frontend and signs the transaction and sends READY to player two with JoinInstruction
* Player two (who is still on waiting screen) gets the READY and then they proceed
* Join instruction : "FOUND" for player one, "READY" for player two that is sent from the client side
 */
func JoinQueue(w http.ResponseWriter, r *http.Request) {
	address := mux.Vars(r)["address"]

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println(err)
		return
	}

	var player *PlayerItem

	// TODO: if queue is full, or max game capacity is filled, still add them in the queue
	if len(queue) == 0 {
		if err := conn.WriteJSON(&QueueAction{
			SenderAddress: address,
			Status:        "ADDED",
			Content:       fmt.Sprintf("Player 1 (%v) addded", address),
		}); err != nil {
			conn.WriteMessage(websocket.CloseMessage, []byte("While sending added message to player one: "+err.Error()))
			return
		}
		player = &PlayerItem{
			player_address:    address,
			opponent_address:  nil,
			socket_connection: conn,
			opp_socket:        nil,
			recv_channel:      make(chan *PlayerItem),
		}
		queue <- player
	} else {
		id := fmt.Sprintf("%d", GetUid())
		fmt.Println("uid: ", id)
		opponent := <-queue

		// Join Instruction for player one
		if err := opponent.socket_connection.WriteJSON(QueueAction{
			SenderAddress: address,
			Status:        "FOUND",
			Content:       id,
		}); err != nil {
			fmt.Println("FOUND message not sent: ", err)
			queue <- opponent
			return
		}
		player = &PlayerItem{
			player_address:    opponent.player_address,
			opponent_address:  &address,
			socket_connection: opponent.socket_connection,
			opp_socket:        conn,
			recv_channel:      opponent.recv_channel,
		}
		opponent.recv_channel <- player
	}

	go player.readStream()
	go player.writeStream()

}
